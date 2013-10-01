var config = {
  name: "migrator-test",
  host: "127.0.0.1",
  port: "5432",
  type: "postgres"
};

if (process.env.NODE_ENV === 'ci') {
  database.user = 'Postgres';
}

module.exports = { database: config };

