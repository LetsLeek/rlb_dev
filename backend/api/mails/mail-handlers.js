const { logger } = require('../../logging/log');
const fs = require('fs').promises;

const getAll = async (req, res) => {
    try {
        const data = await fs.readFile('data\\mails.json');
        const jsonData = JSON.parse(data);
        res.json(jsonData);
    } catch(err) {
        logger.error('Error reading or parsing the file:', err);
        res.status(500).send('Internal Server Error');
    }
};

const getById = async (req, res) => {
    try {
        let id = parseInt(req.params.id);
        const data = await fs.readFile('data\\mails.json');
        const jsonData = JSON.parse(data);
        let mail = jsonData.find((elem) => elem.id === id);
        res.json(mail);
    } catch(err) {
        logger.error('Error finding/parsing/reading the (searched mail)/file:', err);
        res.status(500).send('Internal Server Error');
    }
}

module.exports = {
    getAll,
    getById
};