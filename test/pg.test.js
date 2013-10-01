var config = require('./fixtures/postgres.config').database;
var Client = require('pg').Client;
var runsAsExpected = require('./migrator.js');

describe('Migrations with Postgres', function () {
  context('when supplying postgres as the migrator type', function () {
    config.database = config.name;
    delete config.name;
    var client = new Client(config);
    runsAsExpected('postgres', client);
  });
});
