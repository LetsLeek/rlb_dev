const { logger } = require('../../logging/log');
const { getConnection } = require('../../db/database'); // Importiere die getConnection Methode

// Funktion zum Abrufen aller Personen
const getAll = async (req, res) => {
    try {
        // Hole die bestehende Verbindung zur Datenbank
        const connection = getConnection();

        if (!connection) {
            throw new Error('No database connection available.');
        }

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
    }
};

module.exports = {
    getAll
};
