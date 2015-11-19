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
            assert.include(err.toString(), 'Storage with type "ls" is not supported');

            done();
        });
    });

    it('should return an error when no storage available', function (done) {
        sandbox.stub(KvKeeper, '_getInstance');

        KvKeeper.getStorage(function (err, storage) {
            assert.isUndefined(storage);

            assert.instanceOf(err, Error);
            assert.include(err.toString(), 'This platform does not support any storages');

            done();
        });
    });
});

describe('KvKeeper general methods', function () {
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

            KvKeeper.hasItem('foo', function (err, has) {
                assert.isNull(err);
                assert.isTrue(has);

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
    var backup = {};

    beforeEach(function () {
        backup.dbName = KvKeeper.dbName;
        backup.storeName = KvKeeper.storeName;
        backup.namespace = KvKeeper.namespace;
    });

    afterEach(function () {
        KvKeeper.dbName = backup.dbName;
        KvKeeper.storeName = backup.storeName;
        KvKeeper.namespace = backup.namespace;
        KvKeeper.__configured = null;
    });

    it('should set up correct options', function () {
        KvKeeper.configure({dbName: 'foo', storeName: 'bar'});

        assert.equal(KvKeeper.dbName, 'foo');
        assert.equal(KvKeeper.storeName, 'bar');
        assert.equal(KvKeeper.namespace, 'foo:bar:');
    });

    it('should throw error when you trying to set incorrect option', function () {
        assert.throws(function () {
            KvKeeper.configure({dbName: 'foo', storeNames: 'bars'});
        }, 'Option storeNames is not configurable');

        assert.equal(KvKeeper.dbName, 'kv-keeper-items');
        assert.equal(KvKeeper.storeName, 'items');
        assert.equal(KvKeeper.namespace, 'kv-keeper-items:items:');
    });

    it('should throw error when called more than once', function () {
        KvKeeper.configure({dbName: 'foo1', storeName: 'bar1'});

        assert.throws(function () {
            KvKeeper.configure({dbName: 'foo2', storeName: 'bar2'});
        }, 'Configuration can be set only once');

        assert.equal(KvKeeper.dbName, 'foo1');
        assert.equal(KvKeeper.storeName, 'bar1');
        assert.equal(KvKeeper.namespace, 'foo1:bar1:');
    });
});
