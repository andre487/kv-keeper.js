(function () {
    'use strict';
    window.indexedDBStub = {
        open: function () {
            return new ReqStub();
        }
    };

    var EvStub = window.DbEventStub = function (target) {
        this.type = 'event';

        this.target = target || {};
        this.target.result = this.target.result || {};
    };

    var ReqStub = window.IDBOpenDBRequestStub = function () {
        setTimeout(this.applyDefault.bind(this), 0);
    };

    ReqStub.prototype.applyDefault = function () {
        if (this.onsuccess) {
            this.onsuccess(new EvStub(this));
        }
    };
})();
