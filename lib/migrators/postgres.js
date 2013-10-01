var postgres;
try {
  postgres = require('pg').native;
} catch (e) {
  postgres = require('pg');
}

module.exports = function (config) {
  config.database = config.name;
  delete config.name;
  console.log(config);
  var db = new postgres.Client(config);
  db.connect();

  return {
    query: function (query, cb) {
      query = 'BEGIN; ' + query + 'COMMIT;';
      db.query(query, cb);
    },
    rollback: function (cb) {
      db.query('ROLLBACK;', cb);
    }
  };
};
