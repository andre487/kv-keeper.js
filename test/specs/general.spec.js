describe('KvKeeper.getStorage()', function () {
    var sandbox;

    beforeEach(function () {
        sandbox = sinon.sandbox.create();
    });

    afterEach(function (done) {
        sandbox.restore();

        KvKeeper.getStorage(function (err, storage) {
            if (err) {
                return done(err);
            }
            storage.close();
            done();
        });
    });

    it('should be presented', function () {
        assert.isFunction(KvKeeper.getStorage);
    });

    it('should call back with storage if supported', function (done) {
        var fakeStorage = {
            init: sinon.stub().callsArgWith(0, null, 'StorageInstance')
        };
        sandbox.stub(KvKeeper, '_getInstance').returns(fakeStorage);

        KvKeeper.getStorage(function (err, storage) {
            assert.isNull(err);
            assert.equal(storage, 'StorageInstance');
            done();
        });
    });

    it('should return an error when current storage is not available', function (done) {
        sandbox.stub(KvKeeper, '_getInstance');

        KvKeeper.getStorage('ls', function (err, storage) {
            assert.isUndefined(storage);

            assert.instanceOf(err, Error);
            assert.include(err.toString(), 'No "ls" store support');

            done();
        });
    });

    it('should return an error when no storage available', function (done) {
        sandbox.stub(KvKeeper, '_getInstance');

        KvKeeper.getStorage(function (err, storage) {
            assert.isUndefined(storage);

            assert.instanceOf(err, Error);
            assert.include(err.toString(), 'No supported stores');

            done();
        });
    });

    it('should throw error when called with incorrect type', function () {
        assert.throws(function () {
            KvKeeper.getStorage('incorrect', function () {});
        }, 'Invalid type incorrect');
    });
});

describe('KvKeeper general methods', function () {
    beforeEach(function (done) {
        KvKeeper.clear(function (err) {
            localStorage.clear(); // For be sure
            err ?
                done(err) :
                done();
        });
    });

    it('should implement get and set operations', function (done) {
        KvKeeper.setItem('foo', 'bar', function (err) {
            assert.isNull(err);

            KvKeeper.getItem('foo', function (err, val) {
                assert.isNull(err);
                assert.equal(val, 'bar');

                done();
            });
        });
    });

    it('should implement set and has operations', function (done) {
        KvKeeper.setItem('foo', 'bar', function (err) {
            assert.isNull(err);

            KvKeeper.getItem('foo', function (err, val) {
                assert.isNull(err);
                assert.equal(val, 'bar');

                done();
            });
        });
    });

    it('should implement remove and length operations', function (done) {
        KvKeeper.setItem('foo', 'bar', function (err) {
            assert.isNull(err);

            KvKeeper.removeItem('foo', function (err) {
                assert.isNull(err);

                KvKeeper.getLength(function (err, length) {
                    assert.equal(length, 0);
                    done();
                });
            });
        });
    });

    it('should implement clear and length operations', function (done) {
        KvKeeper.setItem('foo', 'bar', function (err) {
            assert.isNull(err);

            KvKeeper.clear(function (err) {
                assert.isNull(err);

                KvKeeper.getLength(function (err, length) {
                    assert.equal(length, 0);
                    done();
                });
            });
        });
    });
});

describe('KvKeeper.configure()', function () {
    var configurable = ['dbName', 'storeName', 'namespace', 'defaultType'];
    var backup = {};

    beforeEach(function () {
        configurable.forEach(function (name) {
            backup[name] = KvKeeper[name];
        });
    });

    afterEach(function () {
        configurable.forEach(function (name) {
            KvKeeper[name] = backup[name];
        });
        KvKeeper.__configured = null;
    });

    it('should set up correct options', function () {
        KvKeeper.configure({dbName: 'foo', storeName: 'bar', defaultType: 'ls'});

        assert.equal(KvKeeper.dbName, 'foo');
        assert.equal(KvKeeper.storeName, 'bar');
        assert.equal(KvKeeper.namespace, 'foo:bar:');
        assert.equal(KvKeeper.defaultType, 'ls');
    });

    it('should throw error when you trying to set incorrect option', function () {
        assert.throws(function () {
            KvKeeper.configure({dbName: 'foo', storeNames: 'bars', defaultType: 'ls'});
        }, 'storeNames is not configurable');

        assert.equal(KvKeeper.dbName, 'kv-keeper-items');
        assert.equal(KvKeeper.storeName, 'items');
        assert.equal(KvKeeper.namespace, 'kv-keeper-items:items:');
        assert.equal(KvKeeper.defaultType, 'auto');
    });

    it('should throw error when called more than once', function () {
        KvKeeper.configure({dbName: 'foo1', storeName: 'bar1'});

        assert.throws(function () {
            KvKeeper.configure({dbName: 'foo2', storeName: 'bar2', defaultType: 'ls'});
        }, 'Configuration can be set only once');

        assert.equal(KvKeeper.dbName, 'foo1');
        assert.equal(KvKeeper.storeName, 'bar1');
        assert.equal(KvKeeper.namespace, 'foo1:bar1:');
        assert.equal(KvKeeper.defaultType, 'auto');
    });

    it('should throw error with incorrect default type', function () {
        assert.throws(function () {
            KvKeeper.configure({defaultType: 'incorrect'});
        }, 'Invalid type incorrect');

        assert.equal(KvKeeper.defaultType, 'auto');
    });
});
