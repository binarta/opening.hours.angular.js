(function () {
    angular.module('opening.hours', ['momentx', 'notifications', 'toggle.edit.mode', 'calendar.events.rest', 'schedulers'])
        .service('openingHours', ['$q', 'moment', 'calendarEventWriter', 'calendarEventUpdater', 'calendarEventDeleter', 'calendarEventGateway', OpeningHoursService])
        .controller('BinOpeningHoursController', ['openingHours', 'moment', BinOpeningHoursController])
        .controller('BinTimeSlotController', ['$scope', '$templateCache', 'moment', 'editModeRenderer', 'openingHours', BinTimeSlotController])
        .controller('BinOpenClosedSignController', ['openingHours', 'moment', 'schedule', BinOpenClosedSignController])
        .directive('binOpeningHoursOverview', ['$templateCache', 'ngRegisterTopicHandler', BinOpeningHoursOverviewDirective])
        .directive('binTimeSlot', ['editMode', BinTimeSlotDirective])
        .directive('binOpenClosedSign', ['$templateCache', BinOpenClosedSignDirective])
        .run(['openingHours', function (openingHours) {
            openingHours.getForCurrentWeek();
        }]);
    
    function OpeningHoursService($q, moment, writer, updater, deleter, gateway) {
        var events;

        this.getForCurrentWeek = function () {
            var deferred = $q.defer();
            if (events) deferred.resolve(events);
            else {
                var request = {
                    type: 'opening hours',
                    startDate: moment().isoWeekday(0),
                    endDate: moment().isoWeekday(7)
                };
                var presenter = {
                    success: function (results) {
                        events = results;
                        deferred.resolve(results);
                    }
                };
                gateway.findAllBetweenStartDateAndEndDate(request, presenter);
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
        }
    }
    
    function BinOpeningHoursController(openingHours, moment) {
        var self = this;

        this.refresh = getForCurrentWeek;
        
        this.currentDay = moment().isoWeekday();
        
        function getForCurrentWeek() {
            openingHours.getForCurrentWeek().then(function (events) {
                self.days = mapEventsToDays(events);
            });
        }

        getForCurrentWeek();

        function mapEventsToDays(events) {
            var days = [];
            for (var i = 1; i <= 7; i++) {
                days.push({
                    id: i,
                    slots: []
                })
            }

            angular.forEach(events, function (event) {
                var day = days[moment(event.start).isoWeekday() - 1];
                if (day.slots[0] && moment(day.slots[0].start).isAfter(moment(event.start))) day.slots.unshift(event);
                else day.slots.push(event);
            });

            return days;
        }
    }

    function BinOpeningHoursOverviewDirective($templateCache, topics) {
        return {
            restrict: 'E',
            scope: {},
            controller: 'BinOpeningHoursController',
            controllerAs: 'ctrl',
            bindToController: true,
            template: $templateCache.get('bin-opening-hours-overview.html'),
            link: function (scope) {
                topics(scope, 'edit.mode', function (editModeActive) {
                    if (!editModeActive) scope.ctrl.refresh();
                    scope.editing = editModeActive;
                });
            }
        };
    }

    function BinTimeSlotController($scope, $templateCache, moment, editModeRenderer, openingHours) {
        var self = this;
        
        this.getTimeSlot = function () {
            return self.event ? formatTime(self.event.start) + ' - ' + formatTime(self.event.end) : '-';
        };
        
        this.onEdit = function () {
            var scope = $scope.$new();
            scope.day = self.day;
            
            if (self.event) {
                scope.start = moment(self.event.start).toDate();
                scope.end = moment(self.event.end).toDate();
                scope.delete = onDelete;
            }

            scope.close = editModeRenderer.close;

            scope.submit = function () {
                validateForm(scope, onSubmit);
            };

            editModeRenderer.open({
                template: $templateCache.get('bin-edit-time-slot.html'),
                scope: scope
            });
        };

        function formatTime(time) {
            return moment(time).format('HH:mm');
        }

        function formatDate(time, day) {
            var dayString = moment().isoWeekday(day).format('YYYY-MM-DD ');
            var timeString = moment(time).format('HH:mm');
            return moment(dayString + timeString, 'YYYY-MM-DD HH:mm').toISOString();
        }

        function validateForm(scope, onValid) {
            scope.violations = [];
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

        function onSubmit(scope) {
            scope.violation = undefined;
            var start = formatDate(scope.start, self.day.id);
            var end = formatDate(scope.end, self.day.id);
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