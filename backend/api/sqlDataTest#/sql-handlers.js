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
    let connection;

    try {
        logger.debug('Keywords - adding new Keyword');

        const newKeyword = req.body;
        newKeyword.checkedBy = { "person": null, "date": null };

        // Validierungen
        if (newKeyword.name.length < 2) {
            throw new BadRequest('The minimum length of name must not be under 2');
        }

        if (!Array.isArray(newKeyword.responsiblePersons) || newKeyword.responsiblePersons.length === 0) {
            throw new BadRequest('You need to choose at least one responsible Person');
        }

        if (!newKeyword.control || typeof newKeyword.control !== 'string') {
            throw new BadRequest('You need to choose a control setting');
        }

        // Verbindung zur Datenbank herstellen
        connection = await getConnection();

        if (!connection) {
            throw new Error('No database connection available.');
        }

        // Einfügen des neuen Keywords in die Datenbank
        const [result] = await connection.execute(
            'INSERT INTO Keywords (name, control, department) VALUES (?, ?, ?)',
            [newKeyword.name, newKeyword.control, newKeyword.department]
        );

        // Erhalte die ID des neu eingefügten Keywords
        const keywordId = result.insertId;

        // Verknüpfe die verantwortlichen Personen mit dem neuen Keyword
        const responsiblePersons = newKeyword.responsiblePersons;
        const values = responsiblePersons.map(person => [keywordId, person.id]);

        if (values.length > 0) {
            await connection.query(
                'INSERT INTO Keyword_Person_Responsibilities (keyword_id, person_id) VALUES ?',
                [values]
            );
        }

        res.status(201).send('Keyword successfully created');
    } catch (err) {
        logger.error('Error creating the keyword:', err);
        res.status(500).send('Internal Server Error');
    }
};

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
