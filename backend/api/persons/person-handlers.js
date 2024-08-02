const { logger } = require('../../logging/log');
const fs = require('fs').promises;

const getAll = async (req, res) => {
    try {
        const data = await fs.readFile('data\\persons.json');
        const jsonData = JSON.parse(data);
        res.json(jsonData);
    } catch(err) {
        logger.error('Error reading or parsing the file:', err);
        res.status(500).send('Internal Server Error');
    }
};

const create = async (req, res) => {
    // try {

    // } catch(err) {
        
    // }
}

module.exports = {
    getAll
};
