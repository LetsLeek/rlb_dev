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
        if (mail) {
            res.json(mail);
        } else {
            res.status(404).send('Mail not found');
        }
    } catch(err) {
        logger.error('Error finding/parsing/reading the (searched mail)/file:', err);
        res.status(500).send('Internal Server Error');
    }
};

const updateMail = async (req, res) => {
    try {
        let id = parseInt(req.params.id);
        const updatedMail = req.body;

        if (!updatedMail || !updatedMail.isChecked) {
            return res.status(400).send('Bad Request: Missing data');
        }

        const data = await fs.readFile('data\\mails.json');
        const jsonData = JSON.parse(data);

        let mailIndex = jsonData.findIndex((elem) => elem.id === id);

        if (mailIndex === -1) {
            return res.status(404).send('Mail not found');
        }

        jsonData[mailIndex] = { ...jsonData[mailIndex], ...updatedMail };

        await fs.writeFile('data\\mails.json', JSON.stringify(jsonData, null, 2));

        res.json(jsonData[mailIndex]);
    } catch(err) {
        logger.error('Error updating the mail:', err);
        res.status(500).send('Internal Server Error');
    }
};


module.exports = {
    getAll,
    getById,
    updateMail
};
