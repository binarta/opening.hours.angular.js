describe('opening.hours', function () {
    var $rootScope, $q, moment, writer, updater, deleter, gateway, applicationData, configReader, configWriter, topics, configReaderDeferred, configWriterDeferred, checkpointGateway, openingHours;

    beforeEach(module('opening.hours'));

    beforeEach(inject(function (_$rootScope_, _$q_, _moment_, calendarEventWriter, calendarEventUpdater, calendarEventDeleter, calendarEventGateway, applicationDataService, _configReader_, _configWriter_, topicRegistry, binartaCheckpointGateway, _openingHours_) {
        $rootScope = _$rootScope_;
        $q = _$q_;
        moment = _moment_;
        writer = calendarEventWriter;
        updater = calendarEventUpdater;
        deleter = calendarEventDeleter;
        gateway = calendarEventGateway;

        topics = topicRegistry;

        openingHours = _openingHours_;

        configReader = _configReader_;
        configReaderDeferred = $q.defer();
        configReader.and.returnValue(configReaderDeferred.promise);

        configWriter = _configWriter_;
        configWriterDeferred = $q.defer();
        configWriter.and.returnValue(configWriterDeferred.promise);

        checkpointGateway = binartaCheckpointGateway;

        applicationData = applicationDataService;
        applicationData.then.and.callFake(function (listener) {
            listener({});
        });
    }));

    describe('openingHours service', function () {
        var service, dummyData;

        beforeEach(inject(function (openingHours) {
            service = openingHours;

            dummyData = [
                {
                    "namespace": "unikamp",
                    "type": "opening hours",
                    "id": "14fddc64-490f-4555-9883-ef543275d4fe",
                    "start": "2016-07-03T07:00:00Z",
                    "end": "2016-07-03T16:00:00Z"
                },
                {
                    "namespace": "unikamp",
                    "type": "opening hours",
                    "id": "1c4354c7-aaa2-4ddb-bfae-4c0775921aa3",
                    "start": "2016-07-01T07:00:00Z",
                    "end": "2016-07-01T16:00:00Z"
                },
                {
                    "namespace": "unikamp",
                    "type": "opening hours",
                    "id": "49aef6e5-8e13-4cd1-9f50-32b7f5c1d280",
                    "start": "2016-06-27T07:00:00Z",
                    "end": "2016-06-27T16:00:00Z"
                },
                {
                    "namespace": "unikamp",
                    "type": "opening hours",
                    "id": "807663f2-403e-4511-9179-b0069e2f35a2",
                    "start": "2016-06-29T07:00:00Z",
                    "end": "2016-06-29T16:00:00Z"
                },
                {
                    "namespace": "unikamp",
                    "type": "opening hours",
                    "id": "c5cac92a-44ab-4cf7-8117-c153f327083d",
                    "start": "2016-07-02T07:00:00Z",
                    "end": "2016-07-02T16:00:00Z"
                },
                {
                    "namespace": "unikamp",
                    "type": "opening hours",
                    "id": "e1ed56bc-4fd5-410a-b6e5-dca9d4aae395",
                    "start": "2016-06-28T07:00:00Z",
                    "end": "2016-06-28T16:00:00Z"
                }
            ];
        }));

        describe('formatTimeAndDay()', function () {
            var selectedTime, nowInSameDST, nowInDifferentDST;

            beforeEach(function () {
                selectedTime = moment('1970-01-01T09:00:00Z').tz('Europe/Brussels');
                nowInSameDST = moment('2016-01-01T01:00:00Z').tz('Europe/Brussels');
                nowInDifferentDST = moment('2017-05-01T01:00:00Z').tz('Europe/Brussels');
            });

            it("given we selected 10 o'clock", function () {
                expect(selectedTime.hours()).toEqual(10);
            });

            it('when current date and selected time date are in the same DST', function () {
                expect(
                    service.formatTimeAndDay(nowInSameDST, selectedTime, 5).toISOString()
                ).toEqual('2016-01-01T09:00:00.000Z');
            });

            it('when current date is in a different DST from the time date', function () {
                expect(
                    service.formatTimeAndDay(nowInDifferentDST, selectedTime, 7).toISOString()
                ).toEqual('2017-05-07T08:00:00.000Z');
            });
        });

        describe('on getForCurrentWeek', function () {
            describe('when opening hours are defined in common data', function () {
                beforeEach(function () {
                    applicationData.then.and.callFake(function (listener) {
                        listener({openingHours: dummyData});
                    });
                });

                it('request returns data from common data', function () {
                    var hours;

                    service.getForCurrentWeek().then(function (result) {
                        hours = result;
                    });
                    $rootScope.$digest();

                    expect(hours).toEqual(dummyData);
                });
            });

            describe('when opening hours are not defined in common data', function () {
                it('request made for current week', function () {
                    service.getForCurrentWeek();

                    var request = gateway.findAllBetweenStartDateAndEndDate.calls.first().args[0];

                    expect(request.type).toEqual('opening hours');
                    expect(request.startDate).toEqual(moment().isoWeekday(1).startOf('d'));
                    expect(request.endDate).toEqual(moment().isoWeekday(1).add(7, 'd').startOf('d'));
                });
            });
        });
    });

    describe('BinOpeningHoursController', function () {
        var ctrl, data, openingHoursMock, getForCurrentWeekDeferred;

        beforeEach(inject(function ($controller, $q) {
            openingHoursMock = jasmine.createSpyObj('openingHoursMock', ['getForCurrentWeek']);
            getForCurrentWeekDeferred = $q.defer();
            openingHoursMock.getForCurrentWeek.and.returnValue(getForCurrentWeekDeferred.promise);

            ctrl = $controller('BinOpeningHoursController', {
                openingHours: openingHoursMock
            });
        }));

        describe('with mock data', function () {
            beforeEach(inject(function (testData) {
                data = testData;
                getForCurrentWeekDeferred.resolve(data);
            }));

            it('translates to days map with ordered timeslots', function () {
                $rootScope.$digest();

                expect(ctrl.days).toEqual([
                    {
                        id: 1,
                        slots: [
                            data[1],
                            data[0]
                        ]
                    }, {
                        id: 2,
                        slots: [
                            data[2],
                            data[3]
                        ]
                    }, {
                        id: 3,
                        slots: [
                            data[6],
                            data[5]
                        ]
                    }, {
                        id: 4,
                        slots: [
                            data[7],
                            data[8]
                        ]
                    }, {
                        id: 5,
                        slots: [
                            data[4]
                        ]
                    }, {
                        id: 6,
                        slots: []
                    }, {
                        id: 7,
                        slots: []
                    }
                ]);
            });

            it('request current day', function () {
                expect(ctrl.currentDay).toEqual(moment().isoWeekday());
            });
        });

        describe('opening hours widget visibility', function () {
            var statusKey = 'opening.hours.status';

            beforeEach(inject(function ($controller) {
                ctrl = $controller('BinOpeningHoursController');
            }));

            it('default widget status is hidden', function () {
                configReaderDeferred.reject();
                $rootScope.$digest();

                expect(ctrl.status).toEqual('hidden');
            });

            it('when widget is hidden', function () {
                configReaderDeferred.resolve({data: {value: 'hidden'}});
                $rootScope.$digest();

                expect(ctrl.status).toEqual('hidden');
            });

            it('when widget is visible', function () {
                configReaderDeferred.resolve({data: {value: 'visible'}});
                $rootScope.$digest();

                expect(ctrl.status).toEqual('visible');
            });

            it('is not working', function () {
                expect(ctrl.working).toBeFalsy();
            });

            describe('hide the widget', function () {
                beforeEach(function () {
                    configReaderDeferred.resolve({data: {value: 'visible'}});
                    $rootScope.$digest();
                    ctrl.toggle();
                });

                it('is working', function () {
                    expect(ctrl.working).toBeTruthy();
                });

                it('persist config value', function () {
                    expect(configWriter).toHaveBeenCalledWith({
                        scope: 'public',
                        key: statusKey,
                        value: 'hidden'
                    });
                });

                it('on success', function () {
                    configWriterDeferred.resolve();
                    $rootScope.$digest();

                    expect(ctrl.status).toEqual('hidden');
                    expect(ctrl.working).toBeFalsy();
                });

                it('on failed', function () {
                    configWriterDeferred.reject();
                    $rootScope.$digest();

                    expect(ctrl.status).toEqual('visible');
                    expect(ctrl.working).toBeFalsy();
                });
            });

            describe('show openings hours widget', function () {
                beforeEach(function () {
                    configReaderDeferred.resolve({data: {value: 'hidden'}});
                    $rootScope.$digest();
                    ctrl.toggle();
                });

                it('is working', function () {
                    expect(ctrl.working).toBeTruthy();
                });

                it('persist config value', function () {
                    expect(configWriter).toHaveBeenCalledWith({
                        scope: 'public',
                        key: statusKey,
                        value: 'visible'
                    });
                });

                it('on success', function () {
                    configWriterDeferred.resolve();
                    $rootScope.$digest();

                    expect(ctrl.status).toEqual('visible');
                    expect(ctrl.working).toBeFalsy();
                });

                it('on failed', function () {
                    configWriterDeferred.reject();
                    $rootScope.$digest();

                    expect(ctrl.status).toEqual('hidden');
                    expect(ctrl.working).toBeFalsy();
                });
            });
        });

        it('when working, toggle does nothing', function () {
            ctrl.working = true;

            ctrl.toggle();

            expect(configWriter).not.toHaveBeenCalled();
        });

        it('listens for edit mode', function () {
            expect(topics.subscribe.calls.mostRecent().args[0]).toEqual('edit.mode');
        });

        it('when editing', function () {
            topics.subscribe.calls.mostRecent().args[1](true);

            expect(ctrl.editing).toBeTruthy();

            topics.subscribe.calls.mostRecent().args[1](false);

            expect(ctrl.editing).toBeFalsy();
        });

        it('when not editing, refresh events', function () {
            openingHoursMock.getForCurrentWeek.calls.reset();

            topics.subscribe.calls.mostRecent().args[1](false);

            expect(openingHoursMock.getForCurrentWeek).toHaveBeenCalled();
        });

        it('on destroy', function () {
            var listener = topics.subscribe.calls.mostRecent().args[1];

            ctrl.$onDestroy();

            expect(topics.unsubscribe.calls.mostRecent().args[0]).toEqual('edit.mode');
            expect(topics.unsubscribe.calls.mostRecent().args[1]).toEqual(listener);
        });
    });

    describe('BinTimeSlotController', function () {
        var ctrl, renderer, timeout;
        var start = '2016-05-16T08:00:00Z';
        var end = '2016-05-16T10:00:00Z';

        beforeEach(inject(function ($rootScope, $controller, openingHours, editModeRenderer, $timeout) {
            openingHours.getForCurrentWeek();
            renderer = editModeRenderer;
            timeout = $timeout;
            ctrl = $controller('BinTimeSlotController', {
                $scope: $rootScope.$new()
            });
        }));

        describe('for day', function () {
            beforeEach(function () {
                ctrl.day = {
                    id: 1
                };
            });

            function formatDate(time) {
                return openingHours.formatTimeAndDay(moment(), moment(time), 1).toISOString();
            }

            describe('if user has no permissions', function () {
                var scope;
                beforeEach(inject(function (binarta) {
                    binarta.checkpoint.registrationForm.submit({username: 'u', password: 'p'});
                    ctrl.onEdit();
                    scope = renderer.open.calls.first().args[0].scope;
                }));

                it('delete is not available', function () {
                    expect(scope.delete).toBeUndefined();
                });

                it('submit is not available', function () {
                    expect(scope.submit).toBeUndefined();
                });
            });

            describe('if user has the needed permissions', function () {
                beforeEach(inject(function (binarta) {
                    checkpointGateway.addPermission('calendar.event.add');
                    binarta.checkpoint.registrationForm.submit({username: 'u', password: 'p'});
                }));

                it('get time-slot string', function () {
                    expect(ctrl.getTimeSlot()).toEqual('-');
                });

                describe('on edit', function () {
                    beforeEach(function () {
                        ctrl.onEdit();
                    });

                    describe('with renderer scope', function () {
                        var scope;

                        beforeEach(function () {
                            scope = renderer.open.calls.first().args[0].scope;
                            scope.start = moment();
                            scope.start.hours(4);
                            scope.start.minutes(0);
                            scope.start.seconds(0);
                            scope.start.milliseconds(0);
                            scope.end = moment();
                            scope.end.hours(6);
                            scope.end.minutes(0);
                            scope.end.seconds(0);
                            scope.end.milliseconds(0);
                            scope.form = {};
                            scope.form.$valid = true;
                            scope.form.start = { $invalid: false };
                            scope.form.end = { $invalid: false };
                        });

                        describe('on submit with invalid input', function () {
                            it('start time format is incorrect', function () {
                                scope.form.$valid = false;
                                scope.form.start.$invalid = true;
                                scope.form.end.$invalid = false;
                                scope.submit();
                                timeout.flush();
                                expect(scope.violations[0]).toEqual('start.invalid');
                            });

                            it('end time format is incorrect', function () {
                                scope.form.$valid = false;                                
                                scope.form.start.$invalid = false;
                                scope.form.end.$invalid = true;
                                scope.submit();
                                timeout.flush();
                                expect(scope.violations[0]).toEqual('end.invalid');
                            });

                            it('starttime is later than endtime', function () {
                                scope.end.hours(2);
                                scope.submit();
                                timeout.flush();
                                expect(scope.violations[0]).toEqual('end.lowerbound');
                            });

                            it('starttime is equal to endtime', function () {
                                scope.end.hours(4);
                                scope.submit();
                                timeout.flush();
                                expect(scope.violations[0]).toEqual('end.lowerbound');
                            });

                            it('violations are empty when input is correct', function () {
                                scope.form.start = {$invalid: false};
                                scope.form.end = {$invalid: false};
                                scope.submit();
                                expect(scope.violations.length).toEqual(0);
                            });
                        });

                        describe('on submit with end time 00:00', function () {
                            var start, end;

                            beforeEach(function () {
                                scope.start = moment();
                                scope.start.hours(3);
                                scope.start.minutes(0);
                                scope.start.seconds(0);
                                scope.start.milliseconds(0);
                                scope.end = moment();
                                scope.end.hours(0);
                                scope.end.minutes(0);
                                scope.end.seconds(0);
                                scope.end.milliseconds(0);
                                scope.form.$valid = true;
                                start = openingHours.formatTimeAndDay(moment(), moment(scope.start), 1);
                                end = openingHours.formatTimeAndDay(moment(), moment(scope.end), 1).add(1, 'd');
                                scope.submit();
                            });

                            it('check formatted time', function () {  
                                expect(scope.formattedStart).toEqual(start);
                                expect(scope.formattedEnd).toEqual(end);
                            });

                            it('writer is called', function () {
                                expect(writer).toHaveBeenCalledWith({
                                    type: 'opening hours',
                                    recurrence: 'weekly',
                                    start: start.toISOString(),
                                    end: end.toISOString()
                                }, scope, {
                                    success: jasmine.any(Function)
                                });
                            });
                        });

                        describe('on submit', function () {
                            beforeEach(function () {
                                scope.start = start;
                                scope.end = end;
                                scope.form.$valid = true;
                                scope.submit();
                            });

                            it('writer is called', function () {
                                expect(writer).toHaveBeenCalledWith({
                                    type: 'opening hours',
                                    recurrence: 'weekly',
                                    start: formatDate(moment(start)),
                                    end: formatDate(moment(end))
                                }, scope, {
                                    success: jasmine.any(Function)
                                });
                            });

                            describe('on success', function () {
                                beforeEach(function () {
                                    writer.calls.first().args[2].success('new event');
                                    $rootScope.$digest();
                                });

                                it('update local data', function () {
                                    expect(ctrl.event).toEqual('new event');
                                });
                            });
                        });
                    });
                });

                describe('if time-slot is given', function () {
                    beforeEach(function () {
                        ctrl.event = {
                            "namespace": "namespace",
                            "id": "1",
                            "start": start,
                            "end": end,
                            "type": "opening hours"
                        };
                    });

                    it('get time-slot string', function () {
                        expect(ctrl.getTimeSlot()).toEqual(moment(start).format('HH:mm') + ' - ' + moment(end).format('HH:mm'));
                    });

                    describe('on edit', function () {
                        beforeEach(function () {
                            ctrl.onEdit();
                        });

                        it('renderer is called', function () {
                            expect(renderer.open).toHaveBeenCalled();
                        });

                        describe('with renderer scope', function () {
                            var scope;

                            beforeEach(function () {
                                scope = renderer.open.calls.first().args[0].scope;
                                scope.form = {};
                            });

                            it('day is on scope', function () {
                                expect(scope.day.id).toEqual(1);
                            });

                            it('start and end times are on scope', function () {
                                expect(scope.start).toEqual(moment(start).toDate());
                                expect(scope.end).toEqual(moment(end).toDate());
                            });

                            describe('on submit', function () {
                                var updatedStart, updatedEnd;

                                beforeEach(function () {
                                    updatedStart = moment(start).add(1, 'hour');
                                    updatedEnd = moment(end).add(1, 'hour');
                                    scope.start = updatedStart.toDate();
                                    scope.end = updatedEnd.toDate();
                                    scope.form.$valid = true;
                                    scope.submit();
                                });

                                it('updater is called', function () {
                                    expect(updater).toHaveBeenCalledWith({
                                        type: 'opening hours',
                                        recurrence: 'weekly',
                                        start: formatDate(updatedStart),
                                        end: formatDate(updatedEnd),
                                        id: '1',
                                        namespace: 'namespace'
                                    }, scope, {
                                        success: jasmine.any(Function)
                                    });
                                });

                                describe('on success', function () {
                                    beforeEach(function () {
                                        updater.calls.first().args[2].success();
                                        $rootScope.$digest();
                                    });

                                    it('update local data', function () {
                                        expect(ctrl.event.start).toEqual(formatDate(updatedStart));
                                        expect(ctrl.event.end).toEqual(formatDate(updatedEnd));
                                    });

                                    it('renderer is closed', function () {
                                        expect(renderer.close).toHaveBeenCalled();
                                    });
                                });
                            });

                            describe('on delete', function () {
                                beforeEach(function () {
                                    scope.delete();
                                });

                                it('deleter is called', function () {
                                    expect(deleter).toHaveBeenCalledWith(ctrl.event, {success: jasmine.any(Function)});
                                });

                                describe('on success', function () {
                                    beforeEach(function () {
                                        deleter.calls.first().args[1].success();
                                        $rootScope.$digest();
                                    });

                                    it('delete local data', function () {
                                        expect(ctrl.event).toBeUndefined();
                                    });

                                    it('renderer is closed', function () {
                                        expect(renderer.close).toHaveBeenCalled();
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });

    describe('BinOpenClosedController', function () {
        var ctrl, schedule, getForCurrentWeekDeferred;

        beforeEach(inject(function ($controller, _schedule_, openingHours) {
            schedule = _schedule_;
            getForCurrentWeekDeferred = $q.defer();
            openingHours.getForCurrentWeek = function () {
                return getForCurrentWeekDeferred.promise;
            };
            ctrl = $controller('BinOpenClosedSignController');
        }));

        describe('when is open', function () {
            beforeEach(function () {
                getForCurrentWeekDeferred.resolve([{
                    "namespace": "namespace",
                    "id": "1",
                    "start": moment().subtract(1, 'hour').toISOString(),
                    "end": moment().add(1, 'hour').toISOString(),
                    "type": "opening hours"
                }]);
            });

            it('job is scheduled to run immediately and after every minute', function () {
                expect(schedule.forPeriod).toHaveBeenCalledWith(jasmine.any(Function), 60000, true);
            });

            describe('job is executed', function () {
                beforeEach(function () {
                    schedule.forPeriod.calls.first().args[0]();
                    $rootScope.$digest();
                });

                it('is open', function () {
                    expect(ctrl.isOpen).toEqual(true);
                });
            });
        });

        describe('when is closed', function () {
            beforeEach(function () {
                getForCurrentWeekDeferred.resolve([{
                    "namespace": "namespace",
                    "id": "1",
                    "start": moment().subtract(5, 'hour').toISOString(),
                    "end": moment().subtract(1, 'hour').toISOString(),
                    "type": "opening hours"
                }]);
            });

            it('job is scheduled to run immediately and after every minute', function () {
                expect(schedule.forPeriod).toHaveBeenCalledWith(jasmine.any(Function), 60000, true);
            });

            describe('job is executed', function () {
                beforeEach(function () {
                    schedule.forPeriod.calls.first().args[0]();
                    $rootScope.$digest();
                });

                it('is open', function () {
                    expect(ctrl.isOpen).toEqual(false);
                });
            });
        });
    });
});
