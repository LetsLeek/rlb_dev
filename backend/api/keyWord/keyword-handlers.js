const { logger } = require('../../logging/log');
const fs = require('fs').promises;
const { getConnection } = require('../../db/database');
const path = require('path');

const {
    BadRequest,
    NotFound,
    PreConditionFailed,
    UnsupportedMediaType,
    InternalServerError,
  } = require("../../middlewares/error-handling");

  const getAll = async (req, res) => {
    let connection;
  
    try {
      // Verbindung zur Datenbank herstellen
      connection = await getConnection();
  
      if (!connection) {
        throw new Error('No database connection available.');
      }
  
      // Abruf aller Keywords aus der Tabelle `keywords`
      const [keywords] = await connection.query(`
        SELECT 
          id AS keyword_id,
          name AS keyword_name,
          control,
          department
        FROM keywords
      `);
  
      // Abruf aller Verantwortlichen Personen für die Keywords
      const keywordIds = keywords.map(keyword => keyword.keyword_id);
      const [keywordPersons] = await connection.query(`
        SELECT 
          kpr.keyword_id,
          p.id AS person_id,
          p.name AS person_name,
          p.email AS person_email
        FROM keyword_person_responsibilities kpr
        JOIN persons p ON kpr.person_id = p.id
        WHERE kpr.keyword_id IN (?)
      `, [keywordIds]);
  
      // Strukturierung der Verantwortlichen Personen nach Keyword
      const keywordPersonMap = keywordPersons.reduce((acc, { keyword_id, person_id, person_name, person_email }) => {
        if (!acc[keyword_id]) {
          acc[keyword_id] = [];
        }
        acc[keyword_id].push({
          id: person_id,
          name: person_name,
          email: person_email
        });
        return acc;
      }, {});
  
      // Strukturierung der Keywords mit ihren Verantwortlichen
      const result = keywords.map(keyword => ({
        id: keyword.keyword_id,
        name: keyword.keyword_name,
        department: keyword.department,
        control: keyword.control,
        responsiblePersons: keywordPersonMap[keyword.keyword_id] || []
      }));
  
      res.json(result);
    } catch (err) {
      console.error('Error retrieving keywords:', err);
      res.status(500).send('Internal Server Error');
    }
  };
  
  
  

const getAllKeywords = async (department) => {
    try {
        const connection = getConnection();

        if (!connection) throw new Error('No database connection available.');

        const [rows] = await connection.execute(`
            SELECT k.id AS keyword_id, k.name AS keyword_name, k.department AS keyword_department, k.control AS keyword_control,
                   p.id AS person_id, p.name AS person_name, p.email AS person_email,
                   k.checkedByPersonId, k.checkedByDate
            FROM Keywords k
            LEFT JOIN Keyword_Person_Responsibilities kpr ON k.id = kpr.keyword_id
            LEFT JOIN Persons p ON p.id = kpr.person_id
            LEFT JOIN Persons cp ON k.checkedByPersonId = cp.id
        `);

        const keywordMap = {};

        rows.forEach(row => {
            if (!keywordMap[row.keyword_id]) {
                keywordMap[row.keyword_id] = {
                    id: row.keyword_id,
                    name: row.keyword_name,
                    department: row.keyword_department,
                    control: row.keyword_control,
                    responsiblePersons: [],
                    checkedBy: {
                        person: row.checkedByPersonId ? {
                            id: row.checkedByPersonId,
                            name: row.person_name,
                            email: row.person_email,
                        } : null,
                        date: row.checkedByDate || null,
                    }
                };
            }

            if (row.person_id) {
                keywordMap[row.keyword_id].responsiblePersons.push({
                    id: row.person_id,
                    name: row.person_name,
                    email: row.person_email
                });
            }
        });

        const result = Object.values(keywordMap);

        if (department) {
            const filteredData = result.filter(keyword => keyword.department === department);
            return filteredData;
        } else {
            return result;
        }
    } catch(err) {
        logger.error('Error retrieving keywords:', err);
        throw err;
    }
}; // TODO control if unnecessary

const updateById = async (req, res, next) => {
    try {
        const keywordId = +req.params.id;
        const updatedKeywordData = req.body;

        if (!updatedKeywordData) {
            throw new BadRequest("No keyword data provided for update");
        }

        const connection = getConnection();

        // Update the Keywords table
        await connection.execute(
            `UPDATE Keywords SET name = ?, control = ? WHERE id = ?`,
            [updatedKeywordData.name, updatedKeywordData.control, keywordId]
        );

        // Delete existing responsible persons for this keyword
        await connection.execute(
            `DELETE FROM Keyword_Person_Responsibilities WHERE keyword_id = ?`,
            [keywordId]
        );

        // Insert the new responsible persons
        if (updatedKeywordData.responsiblePersons && updatedKeywordData.responsiblePersons.length > 0) {
            const responsibilities = updatedKeywordData.responsiblePersons.map(person => [keywordId, person.id]);
            await connection.query(
                `INSERT INTO Keyword_Person_Responsibilities (keyword_id, person_id) VALUES ?`,
                [responsibilities]
            );
        }

        res.status(204).send();
    } catch (err) {
        logger.error('Error updating the keyword:', err);
        res.status(500).send('Internal Server Error');
    }
};


const create = async (req, res, next) => {
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

        res.status(201).send();
    } catch (err) {
        logger.error('Error creating the keyword:', err);
        res.status(500).send('Internal Server Error');
    }
};

const deleteKeyword = async (req, res) => {
    try {
      logger.debug('Keywords - deleting Keyword by Id with responsible persons');
  
      const connection = await getConnection(); 
      const keywordId = +req.params.id;
  
      if (!connection) throw new Error('No database connection available.');
  
      await connection.execute(
        `DELETE FROM Keywords WHERE id = ?`,
        [keywordId]
    );

    res.status(204).send();
    } catch (err) {
      logger.error('Error retrieving keywords and responsible persons:', err);
      res.status(500).send('Internal Server Error');
    }
  };



module.exports = {
    getAll,
    getAllKeywords,
    create,
    updateById,
    deleteKeyword
};
