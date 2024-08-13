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

  const getAll = async (req, res, next) => {
    let connection;

    try {
        logger.debug('Keywords - getting all Keywords');

        connection = await getConnection();

        if (!connection) {
            throw new Error('No database connection available.');
        }

        // Abrufen von Keywords und deren verantwortlichen Personen in einer einzigen Abfrage
        const [rows] = await connection.execute(`
            SELECT k.id AS keyword_id, k.name AS keyword_name, k.department AS keyword_department,
                   p.id AS person_id, p.name AS person_name, p.email AS person_email
            FROM Keywords k
            LEFT JOIN Keyword_Person_Responsibilities kpr ON k.id = kpr.keyword_id
            LEFT JOIN Persons p ON p.id = kpr.person_id
        `);

        // Verarbeite die Daten
        const keywordMap = {};

        rows.forEach(row => {
            if (!keywordMap[row.keyword_id]) {
                keywordMap[row.keyword_id] = {
                    id: row.keyword_id,
                    name: row.keyword_name,
                    department: row.keyword_department,
                    responsiblePersons: []
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

        // Filter nach Abteilung, falls angegeben
        const department = req.query.dep ? req.query.dep : undefined;
        if (department) {
            const filteredData = result.filter(keyword => keyword.department === department);
            res.json(filteredData);
        } else {
            res.json(result);
        }
    } catch (err) {
        logger.error('Error retrieving keywords and responsible persons:', err);
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

const updateById = async (req, res, next) => { //TODO UPDATE (through DB Connection)
    try {
        console.log("jkdnsldjnfskgjb")
        const keywordId = +req.params.id;
        const updatedKeywordData = req.body;

        if (!updatedKeywordData) {
            throw new BadRequest("No keyword data provided for update")
        }

        let currentData = await getAllKeywords();
        let keyword = currentData.find(currKeyword => currKeyword.id === keywordId)

        if (!keyword) {
            throw new NotFound(`Keyword with id ${keywordId} not found`);
        }

        keyword.name = updatedKeywordData.name;
        keyword.responsiblePersons = updatedKeywordData.responsiblePersons;
        keyword.control = updatedKeywordData.control;

        let updatedData = currentData.filter((data) => data.id != keywordId);
        updatedData.push(keyword);
        
        await fs.writeFile("data\\keywords.json", JSON.stringify(updatedData)); 
        res.status(200).send('Keyword successfully updated');
    } catch(err) {
        logger.error('Error updating the keyword:', err);
        res.status(500).send('Internal Server Error');
    }
}

const create = async (req, res, next) => {
    try {
        logger.debug('Keywords - adding new Keyword');
        let newKeyword = req.body;
        newKeyword.checkedBy = { "person": null, "date": null }
        
        if (newKeyword.name.length < 2) {
            throw new BadRequest('The minimum length of name must no be under 2');
        }

        if (newKeyword.responsiblePersons.length === 0) {
            throw new BadRequest('You need to choose at least one responsible Person');
        }

        if (!newKeyword.control && typeof(newKeyword) != String) {
            throw new BadRequest('You need to choose a control setting');
        }

        let arr = await getAllKeywords();

        newKeyword.id = arr.length+1;

        arr.push(newKeyword);
        await fs.writeFile("data\\keywords.json", JSON.stringify(arr)); 
        res.status(201).send('Keyword successfully created');
    } catch(err) {
        logger.error('Error creating the keyword:', err);
        res.status(500).send('Internal Server Error');
    }
}



module.exports = {
    getAll,
    getAllKeywords,
    create,
    updateById
};
