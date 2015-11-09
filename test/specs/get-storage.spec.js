describe('KvKeeper.getStorage()', function () {
    var sandbox;

    beforeEach(function () {
        sandbox = sinon.sandbox.create();
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('should be presented', function () {
        assert.isFunction(KvKeeper.getStorage);
    });

    it('should call back with storage if supported', function (done) {
        var fakeStorage = {
            ensureReady: sinon.stub().callsArgWith(0, null, 'StorageInstance')
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
