var path = require('path');

module.exports = require('optimist')
  .usage('Either execute or revert all of the migrations in a provided directory on a ' +
      'specified database, or create a new timestamped SQL migration.')
  .options('c', {
    alias: 'config',
    describe: 'Path of configuration file, exposing db type and config options.'
  })
  .options('n', {
    alias: 'name',
    describe: 'The name of the DB to which to connect.'
  })
  .options('p', {
    alias: 'port',
    describe: 'The connection port.'
  })
  .options('h', {
    alias: 'host',
    describe: 'The connection host.'
  })
  .options('U', {
    alias: 'user',
    describe: 'The user with which to connect, if necessary.'
  })
  .options('P', {
    alias: 'password',
    describe: 'The password with which to connect, if necessary.'
  })
  .options('m', {
    alias: 'migrations',
    describe: 'The directory containing sql migrations.',
    default: './migrations'
  })
  .options('t', {
    alias: 'type',
    describe: 'The type of database to connect to. Supported types' +
      'include \'mysql\', \'postgres\'.'
  })
  .options('r', {
    alias: 'revert',
    describe: 'Execute \'down\' migrations to revert all previously-executed migrations in the directory.'
  })
  .options('g', {
    alias: 'generate',
    describe: 'Create a new timestamped \'up\' and \'down\' SQL migration with the provided name.'
  })
  .check(checker);

function checker (argv) {
  var type;
  if (argv.generate) {
    if (typeof argv.generate != 'string' || argv.generate.length === 0) {
      throw new Error('Must provide migration name');
    }
  }
  else {
    if (argv.config) {
      var config = require(path.resolve(argv.config));
      ['name', 'port', 'host', 'type'].forEach(function (key) {
        if (!config.database || !config.database[key]) {
          throw new Error('The configuration file must expose a value for ' + key + '.');
        }
      });
      type = config.database.type;
    }
    else {
      ['name', 'port', 'host', 'type'].forEach(function (key) {
        if (!argv[key]) {
          throw new Error('Must supply a value for ' + key + '.');
        }
      });
      type = argv.type;
    }

    var typeOK = ['postgres', 'mysql'].some(function (dbType) {
      return type.match(dbType);
    });
    if (!typeOK) {
      throw new Error('DB type ' + type + ' is not currently supported.');
    }
  }

  return true;
}

