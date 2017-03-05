module.exports = function (config) {
    require('./shared.conf.js')(config);

    config.set({
        files: ['../../../dist/kv-keeper.min.js'].concat(config.files),

        browsers: ['PhantomJS']
    });
};
