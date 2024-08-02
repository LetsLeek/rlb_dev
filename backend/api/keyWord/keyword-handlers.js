const { logger } = require('../../logging/log');
const fs = require('fs').promises;
const path = require('path');

const {
    BadRequest,
    NotFound,
    PreConditionFailed,
    UnsupportedMediaType,
    InternalServerError,
  } = require("../../middlewares/error-handling");

const getAll = async (req, res, next) => {
    try {
        logger.debug('Keywords - getting new Keywords')
        const data = await fs.readFile('data\\keywords.json');
        let jsonData = JSON.parse(data);

        const department = req.query.dep ? req.query.dep : undefined;
        if (department) {
            jsonData = jsonData.filter((keyword) => keyword.department == department)
        }
        res.json(jsonData);
    } catch(err) {
        logger.error('Error reading or parsing the file:', err);
        res.status(500).send('Internal Server Error');
    }
};

const getAllKeywords = async () => {
    try {
        const data = await fs.readFile('data\\keywords.json');
        return JSON.parse(data);
    } catch (err) {
        logger.error('Error reading or parsing the file:', err);
        throw err; // Um den Fehler an den Aufrufer weiterzugeben
    }
};

const updateById = async (req, res, next) => {
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
