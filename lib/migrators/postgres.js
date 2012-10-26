var postgres = require("pg").native;

module.exports = function (config) {
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
