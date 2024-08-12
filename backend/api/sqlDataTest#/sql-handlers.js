const { logger } = require('../../logging/log');
const mysql = require('mysql2/promise');



const MYSQL_CONFIG = {
    host: 'localhost',
    user: 'root',
    password: 'hannah2020',
    database: 'checkdb',
    port: 3306
};

// Funktion zum Abrufen aller Personen
const getAll = async (req, res) => {
    let connection;
    try {
        // Erstelle eine Verbindung zur Datenbank
        connection = await mysql.createConnection(MYSQL_CONFIG);

        // Führe eine Abfrage aus
        const [rows] = await connection.execute('SELECT * FROM Persons');

        // Filter nach Abteilung, falls angegeben
        const department = req.query.dep ? req.query.dep : undefined;
        if (department) {
            const filteredData = rows.filter((person) => person.department === department);
            res.json(filteredData);
        } else {
            res.json(rows);
        }
    } catch (err) {
        logger.error('Error retrieving data from the database:', err);
        res.status(500).send('Internal Server Error');
    } finally {
        if (connection) {
            await connection.end(); // Schließe die Verbindung
        }
    }
};

module.exports = {
    getAll
};
