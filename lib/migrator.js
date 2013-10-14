var Q = require('q');
var fs = require('fs');
var cp = require('child_process');
var exec = require('child_process').exec;
var moment = require('moment');

var DATE_FORMAT = 'YYYY-MM-DD-HHmmss';

module.exports = function(db, migrationsPath) {
  var migrationsRun = 0;

  return {
    migrate: function () {
      var migrations = getMigrations(migrationsPath, "-up");

      migrations = migrations.sort(function (a, b) {
        return parseInt(b.id, 10) - parseInt(a.id, 10);
      });

      return createMigrationsTable()
          .then(function () {
            return getExecutedMigrations();
          })
          .then(function (executedMigrations) {
            return runMigrations(migrations, executedMigrations);
          });
    },

    revert: function (limit) {
      var migrations = getMigrations(migrationsPath, "-down");
      migrations = migrations.sort(function (a, b) {
        return -(parseInt(a.id, 10) - parseInt(b.id, 10));
      });
      if (limit) { migrations = migrations.slice(0, limit); }
      return getExecutedMigrations()
        .then(function (executedMigrations) {
          return revertMigrations(migrations, executedMigrations);
        });
    },

    generateMigration: function (filename) {
      filename = moment.utc(new Date()).format(DATE_FORMAT) + '.' + filename;
      filename = migrationsPath + '/' + filename;
      var upFile = filename+'-up.sql';
      var downFile = filename+'-down.sql';
      fs.writeFileSync(upFile, '');
      console.log('Created migration: ' + upFile);
      fs.writeFileSync(downFile, '');
      console.log('Created migration: ' + downFile);
      process.exit(0);
    }
  };


  function revertMigrations (migrations, executedMigrations) {
    var current = migrations.shift();
    if (current) {
      var findMatchingMigrations = function () {
        return executedMigrations.indexOf(''+current.id) > -1;
      };

      if (findMatchingMigrations()) {
        var sql = current.sql;
        sql += 'DELETE FROM schema_migrations ' +
          'WHERE version = \'' + current.id + '\';';
        return executeQuery(sql)
          .then(function () {
            console.log('Reverted migration: ' + current.id);
            migrationsRun++;
            return revertMigrations(migrations, executedMigrations);
          })
          .fail(function (err) {
            console.error('Could not migrate database.');
            console.error('Error reverting migration: ' + current.file);
            console.error(err);
          });
      }
    }
    else if (migrations.length === 0) {
      console.log('Completed reverting ' + migrationsRun + ' migrations.');
      return;
    }
    return revertMigrations(migrations, executedMigrations);
  }

  function runMigrations (migrations, executedMigrations) {
    var current = migrations.pop();
    if (current) {
      var findMatchingMigrations = function () {
        return executedMigrations.indexOf(''+current.id) < 0;
      };

      if (findMatchingMigrations()) {
        var sql = current.sql;
        sql += 'INSERT INTO schema_migrations ' +
          'VALUES (' + current.id + ');';
        return executeQuery(sql)
          .then(function () {
            console.log('Executed migration: ' + current.id);
            migrationsRun++;
            return runMigrations(migrations, executedMigrations);
          })
          .fail(function (err) {
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
    return runMigrations(migrations, executedMigrations);
  }

  function createMigrationsTable () {
    var createTableScript = " \
      CREATE TABLE IF NOT EXISTS schema_migrations( \
        version text PRIMARY KEY \
      );";

    return executeQuery(createTableScript);
  }

  function getMigrations (migrationsPath, suffix) {
    return fs.readdirSync(migrationsPath).map(function (filePath) {
      var fileTest = new RegExp('([\\d|-]*)\\.(.*)'+suffix+'\\.sql');
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
  }

  function getExecutedMigrations () {
    return executeQuery('SELECT version FROM schema_migrations;')
      .then(function (rows) {
        return rows.map(function (row) {
          return row.version;
        });
      });
  }

  function executeQuery (query) {
    return Q.ninvoke(db, 'query', query)
      .then(function (result) {
        //mysql and pg return differently
        return result.hasOwnProperty('rows') ? result.rows : result;
      });
  }
};

