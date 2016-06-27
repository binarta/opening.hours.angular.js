describe('opening.hours', function () {
    var $rootScope, $q, moment, writer, updater, deleter, gateway, applicationData;

    beforeEach(module('opening.hours'));

    beforeEach(inject(function (_$rootScope_, _$q_, _moment_, calendarEventWriter, calendarEventUpdater, calendarEventDeleter, calendarEventGateway, applicationDataService) {
        $rootScope = _$rootScope_;
        $q = _$q_;
        moment = _moment_;
        writer = calendarEventWriter;
        updater = calendarEventUpdater;
        deleter = calendarEventDeleter;
        gateway = calendarEventGateway;
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
            ]
        }));

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
        var ctrl, data;

        beforeEach(inject(function ($controller) {
            ctrl = $controller('BinOpeningHoursController');
        }));

        describe('with mock data', function () {
            beforeEach(inject(function (testData) {
                data = testData;
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

            it('refresh gets latest data from memory', function () {
                gateway.findAllBetweenStartDateAndEndDate.calls.reset();
                ctrl.refresh();
                expect(gateway.findAllBetweenStartDateAndEndDate).not.toHaveBeenCalled();
            });
            
            it('request current day', function () {
                expect(ctrl.currentDay).toEqual(moment().isoWeekday());
            });
        });
    });
    
    describe('BinTimeSlotController', function () {
        var ctrl, renderer;
        var start = '2016-05-16T08:00:00Z';
        var end = '2016-05-16T10:00:00Z';
        
        beforeEach(inject(function ($rootScope, $controller, openingHours, editModeRenderer) {
            openingHours.getForCurrentWeek();
            renderer = editModeRenderer;
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
                var dayString = moment().isoWeekday(1).format('YYYY-MM-DD ');
                var timeString = moment(time).format('HH:mm');
                return moment(dayString + timeString, 'YYYY-MM-DD HH:mm').toISOString();
            }

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
            
            describe('if no time-slot is given', function () {
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
                            scope.form = {};
                        });

                        describe('on submit', function () {
                            beforeEach(function () {
                                scope.start = new Date(1970, 0, 1, 10, 0, 0);
                                scope.end = new Date(1970, 0, 1, 12, 0, 0);
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