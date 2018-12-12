(function () {
    angular.module('opening.hours', ['momentx', 'notifications', 'toggle.edit.mode', 'calendar.events.rest', 'schedulers', 'application', 'config', 'binarta-checkpointjs-angular1'])
        .service('openingHours', ['$q', 'moment', 'calendarEventWriter', 'calendarEventUpdater', 'calendarEventDeleter', 'calendarEventGateway', 'applicationDataService', OpeningHoursService])
        .controller('BinOpeningHoursController', ['openingHours', 'moment', 'configReader', 'configWriter', 'topicRegistry', BinOpeningHoursController])
        .controller('BinTimeSlotController', ['$scope', '$templateCache', 'moment', 'editModeRenderer', 'openingHours', 'binarta', BinTimeSlotController])
        .controller('BinOpenClosedSignController', ['openingHours', 'moment', 'schedule', BinOpenClosedSignController])
        .directive('binTimeSlot', ['editMode', BinTimeSlotDirective])
        .directive('binOpenClosedSign', ['$templateCache', BinOpenClosedSignDirective])
        .component('binOpeningHours', {
            controller: 'BinOpeningHoursController',
            templateUrl: 'bin-opening-hours-overview.html'
        })
        .run(['openingHours', function (openingHours) {
            openingHours.getForCurrentWeek();
        }]);

    function OpeningHoursService($q, moment, writer, updater, deleter, gateway, applicationData) {
        var events;

        this.formatTimeAndDay = function (now, time, day) {
            var target = now.isoWeekday(day);
            target.hours(time.hours());
            target.minutes(time.minutes());
            target.seconds(time.seconds());
            target.milliseconds(time.milliseconds());
            return target;
        };

        this.getForCurrentWeek = function () {
            var deferred = $q.defer();
            if (events) deferred.resolve(events);
            else {
                applicationData.then(function (data) {
                    if (data.openingHours) {
                        events = data.openingHours;
                        deferred.resolve(events);
                    } else {
                        gateway.findAllBetweenStartDateAndEndDate({
                            type: 'opening hours',
                            startDate: moment().isoWeekday(1).startOf('d'),
                            endDate: moment().isoWeekday(1).add(7, 'd').startOf('d')
                        }, {
                            success: function (results) {
                                events = results;
                                deferred.resolve(results);
                            }
                        });
                    }
                });
            }
            return deferred.promise;
        };

        this.update = function (event, scope) {
            var action = event.id ? updater : writer;
            var deferred = $q.defer();
            var presenter = {
                success: function (result) {
                    if (result) events.push(result);
                    deferred.resolve(result);
                }
            };
            action(event, scope, presenter);
            return deferred.promise;
        };

        this.delete = function (event) {
            var deferred = $q.defer();
            var presenter = {
                success: function () {
                    var index = events.indexOf(event);
                    if (index != -1) {
                        events.splice(index, 1);
                    }
                    deferred.resolve();
                }
            };
            deleter(event, presenter);
            return deferred.promise;
        };
    }

    function BinOpeningHoursController(openingHours, moment, configReader, configWriter, topics) {
        var ctrl = this;
        var scope = 'public', statusKey = 'opening.hours.status';
        var statusVisible = 'visible';
        var statusHidden = 'hidden';
        var statusDefault = statusHidden;

        function editModeListener(mode) {
            if (!mode) getForCurrentWeek();
            ctrl.editing = mode;
        }

        topics.subscribe('edit.mode', editModeListener);

        configReader({
            scope: scope,
            key: statusKey
        }).then(function (result) {
            ctrl.status = result.data.value || statusDefault;
        }, function () {
            ctrl.status = statusDefault;
        });

        ctrl.toggle = function () {
            if (!ctrl.working) {
                ctrl.working = true;
                var newStatus = ctrl.status == statusVisible ? statusHidden : statusVisible;

                configWriter({
                    scope: scope,
                    key: statusKey,
                    value: newStatus
                }).then(function () {
                    ctrl.status = newStatus;
                }).finally(function () {
                    ctrl.working = false;
                });
            }
        };

        ctrl.$onDestroy = function () {
            topics.unsubscribe('edit.mode', editModeListener);
        };

        this.currentDay = moment().isoWeekday();

        function getForCurrentWeek() {
            openingHours.getForCurrentWeek().then(function (events) {
                ctrl.days = mapEventsToDays(events);
            });
        }

        getForCurrentWeek();

        function mapEventsToDays(events) {
            var days = [];
            for (var i = 1; i <= 7; i++) {
                days.push({
                    id: i,
                    slots: []
                });
            }

            angular.forEach(events, function (event) {
                var day = days[moment(event.start).isoWeekday() - 1];
                if (day.slots[0] && moment(day.slots[0].start).isAfter(moment(event.start))) day.slots.unshift(event);
                else day.slots.push(event);
            });

            return days;
        }
    }

    function BinTimeSlotController($scope, $templateCache, moment, editModeRenderer, openingHours, binarta) {
        var self = this;

        this.getTimeSlot = function () {
            return self.event ? formatTime(self.event.start) + ' - ' + formatTime(self.event.end) : '-';
        };

        this.onEdit = function () {
            var scope = $scope.$new();
            scope.close = editModeRenderer.close;

            if (binarta.checkpoint.profile.hasPermission('calendar.event.add')) {
                scope.day = self.day;

                if (self.event) {
                    scope.start = moment(self.event.start).toDate();
                    scope.end = moment(self.event.end).toDate();
                    scope.delete = onDelete;
                }

                scope.submit = function () {
                    formatStartAndEndTime(scope);
                    validateForm(scope, onSubmit);
                };

                editModeRenderer.open({
                    template: $templateCache.get('bin-edit-time-slot.html'),
                    scope: scope
                });
            } else {
                editModeRenderer.open({
                    template: $templateCache.get('bin-opening-hours-permission-denied.html'),
                    scope: scope
                });
            }
        };

        function formatTime(time) {
            return moment(time).format('HH:mm');
        }

        function validateForm(scope, onValid) {
            scope.violations = [];
            
            if (scope.formattedEnd <= scope.formattedStart) {
                scope.form.$valid = false;
                scope.form.end.$invalid = true;
                scope.form.end.$error = {min: true};
            }
            
            if (scope.form.$valid) onValid(scope);
            else {
                var startField = scope.form.start;
                var endField = scope.form.end;
                if (startField.$invalid) scope.violations.push('start.invalid');
                if (endField.$invalid) {
                    if (endField.$error && endField.$error.min) scope.violations.push('end.lowerbound');
                    else scope.violations.push('end.invalid');
                }
            }
        }

        function formatStartAndEndTime(scope) {
            scope.formattedStart = openingHours.formatTimeAndDay(moment(), moment(scope.start), self.day.id);
            scope.formattedEnd = openingHours.formatTimeAndDay(moment(), moment(scope.end), self.day.id);
            if (scope.formattedEnd.hours() == 0 && scope.formattedEnd.minutes() == 0) scope.formattedEnd.add(1, 'd');
        }

        function onSubmit(scope) {
            scope.violation = undefined;
            var start = scope.formattedStart.toISOString();
            var end = scope.formattedEnd.toISOString();
            var event = {
                type: 'opening hours',
                recurrence: 'weekly',
                start: start,
                end: end
            };
            if (self.event) {
                event.id = self.event.id;
                event.namespace = self.event.namespace;
            }
            openingHours.update(event, scope).then(function (event) {
                if (event) self.event = event;
                else {
                    self.event.start = start;
                    self.event.end = end;
                }
                editModeRenderer.close();
            });
        }

        function onDelete() {
            openingHours.delete(self.event).then(function () {
                self.event = undefined;
                editModeRenderer.close();
            });
        }
    }

    function BinTimeSlotDirective(editMode) {
        return {
            restrict: 'A',
            scope: {
                event: '=?binTimeSlot',
                day: '=forDay'
            },
            controller: 'BinTimeSlotController',
            controllerAs: 'ctrl',
            bindToController: true,
            template: '<span ng-bind="ctrl.getTimeSlot()"></span>',
            link: function (scope, element) {
                editMode.bindEvent({
                    scope: scope,
                    element: element,
                    permission: 'edit.mode',
                    onClick: scope.ctrl.onEdit
                });
            }
        };
    }

    function BinOpenClosedSignController(openingHours, moment, schedule) {
        var self = this;

        schedule.forPeriod(checkIfCurrentlyIsOpen, 60000, true);

        function checkIfCurrentlyIsOpen() {
            openingHours.getForCurrentWeek().then(function (events) {
                var now = moment();
                self.isOpen = false;
                for (var i = 0; i < events.length; i++) {
                    if (now.isBetween(moment(events[i].start), moment(events[i].end))) self.isOpen = true;
                    if (self.isOpen) break;
                }
            });
        }
    }

    function BinOpenClosedSignDirective($templateCache) {
        return {
            restrict: 'E',
            scope: {},
            controller: 'BinOpenClosedSignController',
            controllerAs: 'ctrl',
            bindToController: true,
            template: $templateCache.get('bin-open-closed.html')
        };
    }

})();