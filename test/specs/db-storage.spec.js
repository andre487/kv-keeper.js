var describer = window.indexedDB ? describe : describe.skip;

describer('KvKeeper.StorageDB', function () {
    var secondDb;

    beforeEach(function (done) {
        connectToDb(function () {
            clearDb(done);
        });
    });

    afterEach(function (done) {
        KvKeeper.getStorage('db', function (err, storage) {
            assert.notOk(err);
            storage.close();

            KvKeeper._clearInstance('db');

            clearDb(function () {
                secondDb.close();
                done();
            });
        });
    });

    it('should work on supported platform', function (done) {
        KvKeeper.getStorage('db', function (err, storage) {
            assert.notOk(err);
            assert.instanceOf(storage, KvKeeper.StorageDB);
            done();
        });
    });

    describe('#setItem()', function () {
        it('should set items to DB', function (done) {
            KvKeeper.getStorage('db', function (err, storage) {
                storage.setItem('foo', 'bar', function (err) {
                    assert.isNull(err);

                    getStore().get('foo').onsuccess = function (event) {
                        var result = event.target.result;
                        assert.propertyVal(result, 'key', 'foo');
                        assert.propertyVal(result, 'value', 'bar');
                        done();
                    };
                });
            });
        });
    });

    describe('#getItem()', function () {
        it('should get items from DB', function (done) {
            getStore().add({key: 'foo', value: 'bar'}).onsuccess = function () {
                KvKeeper.getStorage('db', function (err, storage) {
                    storage.getItem('foo', function (err, val) {
                        assert.isNull(err);
                        assert.equal(val, 'bar');
                        done();
                    });
                });
            };
        });
    });

    describe('#hasItem()', function () {
        it('should provide true for existing in DB item', function (done) {
            getStore().add({key: 'foo', value: false}).onsuccess = function () {
                KvKeeper.getStorage('db', function (err, storage) {
                    storage.hasItem('foo', function (err, has) {
                        assert.isNull(err);
                        assert.isTrue(has);
                        done();
                    });
                });
            };
        });

        it('should provide false for absent item', function (done) {
            KvKeeper.getStorage('db', function (err, storage) {
                storage.hasItem('foo', function (err, has) {
                    assert.isNull(err);
                    assert.isFalse(has);
                    done();
                });
            });
        });
    });

    describe('#removeItem()', function () {
        it('should remove items from DB', function (done) {
            getStore().add({key: 'foo', value: 'bar'}).onsuccess = function () {
                KvKeeper.getStorage('db', function (err, storage) {
                    checkHas();

                    function checkHas() {
                        storage.hasItem('foo', function (err, has) {
                            assert.isNull(err);
                            assert.isTrue(has);

                            remove();
                        });
                    }

                    function remove() {
                        storage.removeItem('foo', function (err) {
                            assert.isNull(err);

                            checkHasNot();
                        });
                    }

                    function checkHasNot() {
                        storage.hasItem('foo', function (err, has) {
                            assert.isNull(err);
                            assert.isFalse(has);
                            done();
                        });
                    }
                });
            };
        });
    });

    function connectToDb(done) {
        var req = window.indexedDB.open(KvKeeper.DB_NAME, KvKeeper.DB_VERSION);

        req.onsuccess = function (event) {
            secondDb = event.target.result;

            secondDb.onversionchange = function () {
                throw new Error('Version changed');
            };

            done();
        };

        req.onupgradeneeded = function (event) {
            secondDb = event.target.result;

            secondDb.onversionchange = function () {
                throw new Error('Version changed');
            };

            KvKeeper.StorageDB.setupSchema(secondDb);
            done();
        };

        req.onblocked = req.onerror = function (event) {
            throw new Error('Connect error: ' + event.type);
        };
    }

    function clearDb(done) {
        var store = secondDb.transaction([KvKeeper.STORE_NAME], 'readwrite').objectStore(KvKeeper.STORE_NAME);

        store.clear();

        done();
    }

    function getStore() {
        return secondDb.transaction([KvKeeper.STORE_NAME], 'readwrite').objectStore(KvKeeper.STORE_NAME);
    }
});
