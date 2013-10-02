var rimraf = require('rimraf');
var mkdirp = require('mkdirp');
var fs = require('fs');
var exec = require('child_process').exec;
var Q = require('q');

module.exports = {
  prepareMigratorDir: function (migrationDir) {
    before(function (done) {
      rimraf(migrationDir, function (err) {
        done(err);
      });
    });

    beforeEach(function (next) {
      mkdirp(migrationDir, function (err) {
        next(err);
      });
    });

    afterEach(function (done) {
      rimraf(migrationDir, function (err) { done(err); });
    });
  },

  runMigrator: function (opts, cb) {
    exec('./bin/migrate ' + opts.join(' '), function (err, stdout, stedd) {
      cb(err);
    });
  },

  copyFile: function (source, target) {
    var token = Q.defer();

    var rd = fs.createReadStream(source);
    rd.on("error", function(err) {
      token.reject(err);
    });
    var wr = fs.createWriteStream(target);
    wr.on("error", function(err) {
      token.reject(err);
    });
    wr.on("close", function(ex) {
      token.resolve();
    });
    rd.pipe(wr);

    return token.promise;
  }
};
