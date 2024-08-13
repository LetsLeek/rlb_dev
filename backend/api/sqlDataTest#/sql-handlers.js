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

const getAllKeywords = async (department) => {
    try {
        const connection = getConnection();
            
        if (!connection) throw new Error('No database connection available.');

        const [rows] = await connection.execute('SELECT * FROM Keywords');   

        if (department) {
            const filteredData = rows.filter((keyword) => keyword.department === department);
            return filteredData;
        } else {
            return rows;
        }
    } catch(err) {
        logger.error('Error reading or parsing the file:', err);
        throw err;
    }
}

const createKeyword = async (req, res, next) => {
    try {
        logger.debug('Keywords - creating new Keyword');
        let newKeyword = req.body;
        newKeyword.checkedBy = { "person": null, "date": null }
        
        if (newKeyword.name.length < 2) { //Name darf nicht weniger als 2 Zeichen enthalten
            throw new BadRequest('The minimum length of name must no be under 2');
        }

        if (newKeyword.responsiblePersons.length === 0) { // es sollte minimum eine fuer das Keyword verantwortliche Person zustaendig sein
            throw new BadRequest('You need to choose at least one responsible Person');
        }

        if (!newKeyword.control && typeof(newKeyword) != String) { // Es sollte auf jeden Fall eine Kontrolleinstellung beinhalten
            throw new BadRequest('You need to choose a control setting');
        }

        res.status(201).send('Keyword successfully created');
    } catch(err) {
        logger.error('Error creating the keyword:', err);
        res.status(500).send('Internal Server Error');
    }
}

// const createCheck = async (req, res) => {
//     try {
//         const connection = getConnection();

//         if (!connection) {
//             throw new Error('No database connection available.');
//         }

//         const [rows] = await connection.execute('SELECT * FROM Persons');
//     } catch(err) {
        


//     }
// }



module.exports = {
    getAll,
    createKeyword
    // createCheck
};
