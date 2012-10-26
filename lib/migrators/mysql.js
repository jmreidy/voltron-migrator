var mysql = require("mysql");

module.exports = function (config) {
  config.multipleStatements = true;
  var db = mysql.createConnection(config);
  db.connect();

  return {
    query: function (query, cb) {
      query = 'START TRANSACTION; ' + query + 'COMMIT;';
      db.query(query, cb);
    },
    rollback: function (cb) {
      db.query('ROLLBACK;', cb);
    }
  };
};
