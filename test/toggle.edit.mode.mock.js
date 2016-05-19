angular.module('toggle.edit.mode', [])
    .service('editModeRenderer', function () {
        return jasmine.createSpyObj('editModeRenderer', ['open', 'close']);
    });