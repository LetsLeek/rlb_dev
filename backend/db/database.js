const mysql = require('mysql2/promise');
const { logger } = require('../logging/log');

const dbConnectTimeout = 5000;

async function createConnection(config, recreateDatabase) {
  let connection;

  try {
    logger.info(`DB - Setting up connection using ${config.host}:${config.port}`);

    if (recreateDatabase) {
      logger.info(`DB - Start dropping current database`);
      await dropCurrentDB(config);
      logger.info('DB - Current database dropped!');
    }

    connection = await mysql.createConnection(config);

    logger.info(`DB - Connection to ${config.host}:${config.port} established.`);
  } catch (err) {
    logger.error('DB - Unable to setup connection... ', err);
    process.exit(1);
  }

  return connection;
}

async function dropCurrentDB(config) {
  let connection;

  try {
    connection = await mysql.createConnection({
      host: config.host,
      user: config.user,
      password: config.password,
      port: config.port
    });

    await connection.query(`DROP DATABASE IF EXISTS \`${config.database}\``);
    logger.info('DB - Current database dropped.');
  } catch (err) {
    logger.error('DB - Unable to drop database... ', err);
  } finally {
    if (connection) {
      await connection.end(); // Schließen der Verbindung
    }
  }
}

module.exports = { createConnection, dropCurrentDB };
