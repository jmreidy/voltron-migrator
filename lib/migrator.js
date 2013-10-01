var Q = require('q');
var fs = require('fs');
var cp = require('child_process');
var exec = require('child_process').exec;
var moment = require('moment');

var DATE_FORMAT = 'YYYY-MM-DD-HH:mm:ss';

module.exports = function(db, migrationsPath) {
  var migrationsRun = 0;

  var generateMigration = function (filename) {
    filename = moment.utc(new Date()).format(DATE_FORMAT) + '_' + filename;
    filename = migrationsPath + '/' + filename;
    var upFile = filename+'_up.sql';
    var downFile = filename+'_down.sql';
    fs.writeFileSync(upFile, '');
    console.log('Created migration: ' + upFile);
    fs.writeFileSync(downFile, '');
    console.log('Created migration: ' + downFile);
    process.exit(0);
  };

  var migrate = function (suffix) {
    var migrationList = fs.readdirSync(migrationsPath);
    var migrations = migrationList.map(function (filePath) {
      var fileTest = new RegExp('([^_]*)_(.*)'+suffix+'\\.sql');
      var m = filePath.match(fileTest);
      if (m) {
        var file = migrationsPath + '/' + m[0];
        return {
          id: moment(m[1], DATE_FORMAT).valueOf(),
          file: file,
          sql: fs.readFileSync(file, "utf8")
        };
      }
    });

    migrations = migrations.sort(function (a, b) {
      if (suffix === '_up') {
        return parseInt(b.id, 10) - parseInt(a.id, 10);
      }
      else if (suffix === '_down') {
        return parseInt(a.id, 10) - parseInt(b.id, 10);
      }
    });

    return createMigrationsTable()
      .then(function () {
        return getExecutedMigrations();
      })
    .then(function (executedMigrations) {
      return runMigrations(migrations, executedMigrations, suffix);
    });
  };

  var runMigrations = function(migrations, executedMigrations, suffix) {
    var current = migrations.pop();
    if (current) {
      var test;
      if (suffix === '_up') {
        test = function () {
          return executedMigrations.indexOf(''+current.id) < 0;
        };
      }
      else if (suffix === '_down') {
        test = function () {
          return executedMigrations.indexOf(''+current.id) > -1;
        };
      }

      if (test()) {
        var sql = current.sql;
        if (suffix === '_up') {
          sql += 'INSERT INTO schema_migrations ' +
            'VALUES (' + current.id + ');';
        }
        else if (suffix === '_down') {
          sql += 'DELETE FROM schema_migrations ' +
            'WHERE version = \'' + current.id + '\';';
        }
        return Q.ninvoke(db, 'query', sql)
          .then(function () {
            console.log('Executed migration: ' + current.id);
            migrationsRun++;
            return runMigrations(migrations, executedMigrations, suffix);
          }, function (err) {
            console.error('Could not migrate database.');
            console.error('Error on migration: ' + current.file);
            console.error(err);
          });
      }
    }
    else if (migrations.length === 0) {
      console.log('Completed executing ' + migrationsRun + ' migrations.');
      return;
    }
    return runMigrations(migrations, executedMigrations, suffix);
  };

  var createMigrationsTable = function () {
    var createTableScript = 'CREATE TABLE IF NOT EXISTS schema_migrations('+
        'version text PRIMARY KEY'+
        ');';

    return Q.ninvoke(db, 'query', createTableScript);
  };

  var getExecutedMigrations = function () {
    return Q.ninvoke(db, 'query', 'SELECT version FROM schema_migrations;')
      .then(function (result) {
        return result.rows.map(function (row) {
          return row.version;
        });
      });
  };

  return {
    migrate: migrate,
      generateMigration: generateMigration
  };
};

