require("dotenv").config({
  path: `../env-files/${process.env.NODE_ENV || "development"}.env`
});

global.Promise = require("bluebird");
// knexfile.js
module.exports = {
  development: {
    client: "pg",
    connection: {
      database: "lxpdb",
      user: "admin",
      password: "admin",

      //  # WORKING
      host: "lxp-postgresdb",
      port: 5432,

      //  # FOR MIGRATION
      //  host: 'localhost',
      //  port: 54321
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      directory: "./migrations",
      tableName: "migrations"
    },
    seeds: {
      directory: "./seeds"
    }
  },

  staging: {
    client: "pg",
    connection: process.env.DATABASE_URL || {
      host: process.env.DATABASE_HOST,
      port: process.env.DATABASE_PORT,
      database: process.env.DATABASE_NAME,
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      directory: "./migrations",
      tableName: "migrations"
    },
    seeds: {
      directory: "./seeds"
    }
  },

  production: {
    client: "pg",
    connection: {
      host: "localhost",
      port: 5432,
      /* FOR MIGRATION */
      /* host: 'localhost',
       port: 54320,  */

      database: "rmsdb",
      user: "rmsdb",
      password: "admin"
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      directory: "./migrations",
      tableName: "migrations"
    },
    seeds: {
      directory: "./seeds"
    }
  }
};
