const { logger } = require('../../logging/log');
const fs = require('fs').promises;

const getAll = async (req, res) => {
    try {
        const data = await fs.readFile('data\\persons.json');
        let jsonData = JSON.parse(data);

        const department = req.query.dep ? req.query.dep : undefined;
        if (department) {
            jsonData = jsonData.filter((person) => person.department == department)
        }
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
