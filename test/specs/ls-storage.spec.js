describe('KvKeeper.StorageLS', function () {
    it('should work on supported platform', function (done) {
        KvKeeper.getStorage('ls', function (err, storage) {
            assert.notOk(err);
            assert.instanceOf(storage, KvKeeper.StorageLS);
            done();
        });
    });
});
