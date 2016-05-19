angular.module('calendar.events.rest', [])
    .factory('calendarEventWriter', function () {
        return jasmine.createSpy('calendarEventWriter');
    })
    .factory('calendarEventUpdater', function () {
        return jasmine.createSpy('calendarEventUpdater');
    })
    .factory('calendarEventDeleter', function () {
        return jasmine.createSpy('calendarEventDeleter');
    })
    .service('calendarEventGateway', function (testData) {
        this.findAllBetweenStartDateAndEndDate = jasmine.createSpy('findAllBetweenStartDateAndEndDate').andCallFake(function (request, response) {
            response.success(testData);
        });
    })
    .constant('testData', [
        {
            "namespace": "namespace",
            "id": "1",
            "start": "2016-05-16T11:00:00Z",
            "end": "2016-05-16T16:00:00Z",
            "type": "opening hours"
        },
        {
            "namespace": "namespace",
            "id": "0",
            "start": "2016-05-16T08:00:00Z",
            "end": "2016-05-16T10:00:00Z",
            "type": "opening hours"
        },
        {
            "namespace": "namespace",
            "id": "2",
            "start": "2016-05-17T08:00:00Z",
            "end": "2016-05-17T10:00:00Z",
            "type": "opening hours"
        },
        {
            "namespace": "namespace",
            "id": "3",
            "start": "2016-05-17T11:00:00Z",
            "end": "2016-05-17T16:00:00Z",
            "type": "opening hours"
        },
        {
            "namespace": "namespace",
            "id": "8",
            "start": "2016-05-20T08:00:00Z",
            "end": "2016-05-20T16:00:00Z",
            "type": "opening hours"
        },
        {
            "namespace": "namespace",
            "id": "5",
            "start": "2016-05-18T11:00:00Z",
            "end": "2016-05-18T16:00:00Z",
            "type": "opening hours"
        },
        {
            "namespace": "namespace",
            "id": "4",
            "start": "2016-05-18T08:00:00Z",
            "end": "2016-05-18T10:00:00Z",
            "type": "opening hours"
        },
        {
            "namespace": "namespace",
            "id": "6",
            "start": "2016-05-19T08:00:00Z",
            "end": "2016-05-19T10:00:00Z",
            "type": "opening hours"
        },
        {
            "namespace": "namespace",
            "id": "7",
            "start": "2016-05-19T11:00:00Z",
            "end": "2016-05-19T16:00:00Z",
            "type": "opening hours"
        }
    ]);
