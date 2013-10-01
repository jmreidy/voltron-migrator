var fs = require('fs');
var globule = require('globule');
var assert = require('assert');
var exec = require('child_process').exec;
var rimraf = require('rimraf');
var Q = require('q');


module.exports = function (type, client) {
  var opts = [];

  prepareMigratorDir('./migrations');

  before(function () {
    client.connect();
  });

  after(function () {
    client.end();
  });

  context('if a config file is provided', function () {
    opts.push('--config', './test/fixtures/'+type+'.config.json');
    itWorksAsExpected(opts, client);
  });

  context('if parameters are passed directly', function () {
    opts.push('--type', type);
    opts.push('--database', 'test-db', '--host', '127.0.0.1', '--port');
    itWorksAsExpected(opts, client);
  });

};

function itWorksAsExpected (baseOpts, client) {
  var opts;

  beforeEach(function () {
    opts = baseOpts.slice();
  });

  afterEach(function (next) {
    client.query(
      "SELECT * FROM information_schema.tables WHERE table_schema = 'public';",
      function (err, result) {
        if (err) { return next(err); }
        var queries = [];
        if (result.rows.length > 0) {
          result.rows.forEach(function (row) {
            queries.push('DROP TABLE ' + row.table_name);
          });
          return client.query(queries.join(';'), next);
        }
        else {
          return next();
        }
    });
  });

  context('if a custom migrations directory is provided', function () {
    var customMigrationDir = './tmp/customDir';
    prepareMigratorDir(customMigrationDir);

    it('stores the migrations in the specified directory', function (next) {
      opts.push('--migrations', customMigrationDir);
      opts.push('--generate', 'test-migration');
      runMigrator(opts, function (err) {
        if (err) { return next(err); }
        var migrations = globule.find('./tmp/customDir/*.sql');

        assert(migrations.length === 2);

        next();
      });

    });
  });


  it('generates migrations for the provided label', function (next) {
    var label = 'foo';
    opts.push('--generate', label);
    runMigrator(opts, function (err) {
      if (err) { return next(err); }

      assert(globule.find('./migratons/*_'+label+'_up.sql'));
      assert(globule.find('./migratons/*_'+label+'_down.sql'));

      next();
    });
  });

  context('when migrations exist', function () {
    beforeEach(function (done) {
      var migrations = globule.find('./test/fixtures/*.sql');
      Q.all(migrations.map(function (sql) {
        var name = sql.match(/\/(\w|_)+.sql$/)[0];
        return copyFile(sql, './migrations/'+name);
      })).fin(done);
    });

    describe('the default action', function () {

      it('runs all new up migrations', function (next) {
        runMigrator(opts, function (err) {
          if (err) { return next(err); }
          client.query('SELECT name FROM test;', function (err, result) {
            if (err) { return next(err); }
            assert.ok(result.rows.length === 1);
            assert.ok(result.rows[0].name === 'foo');
            next();
          });
        });
      });

      it('creates a migrations table', function (next) {
        runMigrator(opts, function (err) {
          if (err) { return next(err); }

          client.query(
            'SELECT * FROM information_schema.tables WHERE table_name=\'schema_migrations\';',
            function (err, result) {
              if (err) { return next(err); }
              assert.ok(result.rows.length > 0);
              next();
            });
        });
      });
    });

    describe('if revert is passed', function () {
      it('reverts all migrations', function (next) {

        runMigrator(opts, function (err) {
          if (err) { return next(err); }
          opts.push('--revert');

          runMigrator(opts, function (err) {
            if (err) { return next(err); }
            client.query(
              'SELECT * FROM information_schema.tables WHERE table_schema = \'public\';',
              function (err, result) {
                if (err) { return next(err); }
                assert.ok(result.rows.length == 1);
                next();
              });
          });

        });

      });

    });
  });
}

function prepareMigratorDir (migrationDir) {
  before(function (done) {
    rimraf(migrationDir, function (err) {
      done(err);
    });
  });

  beforeEach(function () {
    fs.mkdirSync(migrationDir);
  });

  afterEach(function (done) {
    rimraf(migrationDir, function (err) { done(err); });
  });
}

function runMigrator (opts, cb) {
  exec('./bin/migrate ' + opts.join(' '), function (err, stdout, stedd) {
    cb(err);
  });
}

function copyFile(source, target) {
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
