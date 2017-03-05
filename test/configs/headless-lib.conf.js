module.exports = function (config) {
    require('./shared.conf')(config);

    config.set({
        files: ['../../lib/kv-keeper.js'].concat(config.files),

        browsers: ['PhantomJS']
    });
};
