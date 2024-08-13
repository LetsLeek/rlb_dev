const mysql = require('mysql2/promise'); 
const { logger } = require('../logging/log'); 

const dbConnectTimeout = 5000; 
let connection; 

/**
 * Erstellt eine Verbindung zur MySQL-Datenbank und speichert sie global.
 * Falls angegeben, wird die bestehende Datenbank gelöscht und neu erstellt.
 *
 * @param {Object} config - Die Konfigurationsparameter für die Datenbankverbindung.
 * @param {boolean} recreateDatabase - Gibt an, ob die aktuelle Datenbank gelöscht und neu erstellt werden soll.
 * @returns {Object} - Die MySQL-Verbindung.
 */
async function createConnection(config, recreateDatabase) {
  // Wenn eine Verbindung bereits besteht, wird sie wiederverwendet
  if (connection) {
    logger.info('DB - Reusing existing connection.');
    return connection;
  }

  try {
    logger.info(`DB - Setting up connection using ${config.host}:${config.port}`);

    // Wenn angegeben, wird die bestehende Datenbank gelöscht
    if (recreateDatabase) {
      logger.info(`DB - Start dropping current database`);
      await dropCurrentDB(config);
      logger.info('DB - Current database dropped!');
    }

    // Erstellt eine neue Verbindung zur Datenbank
    connection = await mysql.createConnection(config);
    logger.info(`DB - Connection to ${config.host}:${config.port} established.`);
  } catch (err) {
    // Fehlerbehandlung bei Verbindungsproblemen
    logger.error('DB - Unable to setup connection... ', err);
    process.exit(1); // Beendet den Prozess bei Verbindungsfehlern
  }

  return connection; // Gibt die Verbindung zurück, die jetzt global gespeichert ist
}

/**
 * Löscht die bestehende Datenbank, wenn sie existiert.
 *
 * @param {Object} config - Die Konfigurationsparameter für die Datenbankverbindung.
 */
async function dropCurrentDB(config) {
  let connection;

  try {
    // Verbindung wird erstellt, aber ohne eine spezifische Datenbank zu verwenden
    connection = await mysql.createConnection({
      host: config.host,
      user: config.user,
      password: config.password,
      port: config.port
    });

    // Löscht die bestehende Datenbank
    await connection.query(`DROP DATABASE IF EXISTS \`${config.database}\``);
    logger.info('DB - Current database dropped.');
  } catch (err) {
    // Fehlerbehandlung bei Problemen mit dem Löschen der Datenbank
    logger.error('DB - Unable to drop database... ', err);
  } finally {
    // Verbindung wird geschlossen, falls sie geöffnet wurde
    if (connection) {
      await connection.end();
    }
  }
}

/**
 * Gibt die aktuell bestehende Datenbankverbindung zurück.
 *
 * @returns {Object} - Die MySQL-Verbindung.
 */
function getConnection() {
  return connection; // Gibt die globale Verbindung zurück
}

module.exports = { createConnection, dropCurrentDB, getConnection };
