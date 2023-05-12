const PGDB_PASSWORD = process.env.PGDB_PASSWORD;

module.exports = {
  development: {
    client: "pg",
    connection:process.env.PG_URL,
    // {
    //   host: process.env.PGHOST,
    //   database: process.env.PGDATABASE,
    //   user: process.env.PGUSER,
    //   password: process.env.PGDB_PASSWORD,
    //   port: 5432,
    //   sslmode: "require",
    // },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      tableName: "knex_migrations",
      directory: `${__dirname}/db/migrations`,
    },
    seeds: {
      directory: `${__dirname}/db/seeds`,
    },
  },
};
