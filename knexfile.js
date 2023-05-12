
const PGDB_PASSWORD = process.env.PGDB_PASSWORD;

module.exports = {
  development: {
    client: 'postgresql',
    connection: {
      host: 'localhost',
      database: 'orderTracker',
      user: 'postgres',
      password: PGDB_PASSWORD,
      port:5431
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: `${__dirname}/db/migrations`
    },
    seeds: {
      directory: `${__dirname}/db/seeds`
    }
  }
};