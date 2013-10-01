var globule = require('globule');
var assert = require('assert');
var Q = require('q');
var helpers = require('./helpers');


module.exports = function (type, client) {
  var configPath = '/fixtures/'+type+'.config';

  helpers.prepareMigratorDir('./migrations');

  before(function () {
    client.connect();
  });

  after(function () {
    client.end();
  });


  context('if a config file is provided', function () {
    var opts = [];
    opts.push('--config', './test'+configPath);
    itWorksAsExpected(opts, client);
  });

  context('if parameters are passed directly', function () {
    var opts = [];
    var config = require('.'+configPath);
    Object.keys(config.database).forEach(function (key) {
      //the postgres connection can mutate the config object
      if (key === 'database') {
        opts.push('--name', config.database[key]);
      }
      else {
        opts.push('--'+key, config.database[key]);
      }

    });
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
    helpers.prepareMigratorDir(customMigrationDir);

    it('stores the migrations in the specified directory', function (next) {
      opts.push('--migrations', customMigrationDir);
      opts.push('--generate', 'test-migration');
      helpers.runMigrator(opts, function (err) {
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
    helpers.runMigrator(opts, function (err) {
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
        return helpers.copyFile(sql, './migrations/'+name);
      })).fin(done);
    });

    describe('the default action', function () {

      it('runs all new up migrations', function (next) {
        helpers.runMigrator(opts, function (err) {
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
        helpers.runMigrator(opts, function (err) {
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

      it('does not execute already-completed migrations');
    });

    describe('if revert is passed', function () {
      it('reverts all migrations', function (next) {

        helpers.runMigrator(opts, function (err) {
          if (err) { return next(err); }
          opts.push('--revert');

          helpers.runMigrator(opts, function (err) {
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

      context('if limit is passed', function () {
        it('only reverts migrations up to the limit count');
      });

    });
  });
}

