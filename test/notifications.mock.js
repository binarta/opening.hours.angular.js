angular.module('notifications', [])
    .factory('ngRegisterTopicHandler', function () {
        return function () {

        }
    })
    .factory('topicRegistry', function () {
        return jasmine.createSpyObj('topicRegistry', ['subscribe', 'unsubscribe']);
    });
