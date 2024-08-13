const { logger } = require('../../logging/log');
const { getConnection } = require('../../db/database');

const getAll = async (req, res) => {
    try {

        const connection = getConnection();

        if (!connection) {
            throw new Error('No database connection available.');
        }

        const [rows] = await connection.execute('SELECT * FROM Persons');

        const department = req.query.dep ? req.query.dep : undefined;
        if (department) {
            const filteredData = rows.filter((person) => person.department === department);
            res.json(filteredData);
        } else {
            res.json(rows);
        }
    } catch(err) {
        logger.error('Error retrieving data from the database:', err);
        res.status(500).send('Internal Server Error');
    }
};

//TODO Create Persons from AD (through AD CONNECT)

module.exports = {
    getAll
};
