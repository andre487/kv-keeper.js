describe('KvKeeper.StorageDB', function () {
    it('should work on supported platform', function (done) {
        KvKeeper.getStorage('db', function (err, storage) {
            assert.notOk(err);
            assert.instanceOf(storage, KvKeeper.StorageDB);
            done();
        });
    });
});
