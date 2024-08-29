const { logger } = require('../../logging/log');
const fs = require('fs').promises;
require('dotenv').config();
const Imap = require('imap-simple');
const { simpleParser } = require('mailparser');
const nodemailer = require('nodemailer');

// IMAP-Konfiguration aus Umgebungsvariablen laden
const imapConfig = {
    imap: {
        user: process.env.IMAP_USER,
        password: process.env.IMAP_PASSWORD,
        host: process.env.IMAP_HOST,
        port: parseInt(process.env.IMAP_PORT, 10) || 993,
        tls: process.env.IMAP_TLS === 'true',
        authTimeout: 3000
    }
};

// Funktion zum Abrufen von E-Mails
async function fetchEmails() {
    try {
        const connection = await Imap.connect(imapConfig);
        await connection.openBox('INBOX');

        const searchCriteria = ['UNSEEN'];
        const fetchOptions = {
            bodies: ['HEADER', 'TEXT'],
            markSeen: true
        };

        const messages = await connection.search(searchCriteria, fetchOptions);

        const emails = await Promise.all(messages.map(async item => {
            const all = item.parts.find(part => part.which === 'TEXT');
            const id = item.attributes.uid;

            const parsed = await simpleParser(all.body);
            return {
                id,
                subject: parsed.subject,
                from: parsed.from.text,
                date: parsed.date,
                body: parsed.text
            };
        }));

        await connection.end();

        return emails;

    } catch (error) {
        logger.error('Error fetching emails:', error);
        throw error;
    }
}

async function getMails(req, res) {
    try {
        const emails = await fetchEmails();
        res.json({
            success: true,
            emails
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch emails',
            error: error.message
        });
    }
}

// Funktion zum Senden von Warn-E-Mails
async function sendWarningMail(req, res) {
    const { departmentEmail, subject, message } = req.body;

    // validation
    if (!departmentEmail || !subject || !message) {
        return res.status(400).json({
            success: false,
            message: 'Missing required fields: departmentEmail, subject, message'
        });
    }

    try {
        // Erstelle einen Transporter mit SMTP-Konfiguration aus Umgebungsvariablen
        let transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT, 10) || 587,
            secure: process.env.SMTP_SECURE === 'true', // true für Port 465, false für andere Ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASSWORD
            }
        });

        // Sende die E-Mail
        let info = await transporter.sendMail({
            from: process.env.SMTP_FROM, // Absenderadresse
            to: departmentEmail, // Empfängeradresse
            subject: subject, // Betreffzeile
            text: message, // Textkörper
            // html: "<b>Deine Nachricht</b>", // Optional: HTML-Körper
        });

        console.log('Message sent: %s', info.messageId);

        res.json({
            success: true,
            message: 'Warning email sent successfully',
            messageId: info.messageId
        });

    } catch (error) {
        logger.error('Error sending warning email:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send warning email',
            error: error.message
        });
    }
}

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
    updateMail,

    getMails, 
    sendWarningMail
};
