angular.module('schedulers', [])
    .service('schedule', function () {
        this.forPeriod = jasmine.createSpy('forPeriod'); 
    });