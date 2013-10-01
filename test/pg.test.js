var config = require('./fixtures/postgres.config.json');
var Client = require('pg').Client;
var runsAsExpected = require('./migrator.js');

describe('Migrations with Postgres', function () {
  context('when supplying postgres as the migrator type', function () {
    var client = new Client(config.database);
    runsAsExpected('postgres', client);
  });
});
