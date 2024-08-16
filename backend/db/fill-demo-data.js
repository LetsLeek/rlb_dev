const mysql = require('mysql2/promise');
const { logger } = require('../logging/log');

// MySQL-Konfiguration
const MYSQL_CONFIG = {
    host: 'localhost',
    user: 'root',
    password: 'hannah2020',
    database: 'checkdb',
    port: 3306
};

// Datenbank-Füllfunktion
async function fillDemoData() {
    let connection;

    try {
        // Verbinde mit der Datenbank
        connection = await mysql.createConnection(MYSQL_CONFIG);

        // Beginne die Transaktion
        await connection.beginTransaction();

        // SQL Statements ausführen

        // Löschen der vorhandenen Daten und Zurücksetzen des AUTO_INCREMENT
        await connection.query('CALL DeletePersonRecords();');
        await connection.query('ALTER TABLE `Persons` AUTO_INCREMENT = 1;');
        await connection.query('CALL DeleteKeywordRecords();');
        await connection.query('ALTER TABLE `Keywords` AUTO_INCREMENT = 1;');
        await connection.query('CALL DeleteCheckRecords();');
        await connection.query('ALTER TABLE `Checks` AUTO_INCREMENT = 1;');
        await connection.query('CALL DeleteKeywordPersonMidtableRecords();');
        await connection.query('CALL DeleteCheckKeywordMidtableRecords();');

        // Einfügen von Personen
        const personsQuery = `
            INSERT INTO Persons (name, email, department) VALUES
            ('Daria Suldac', 'dariasuldac@outlook.com', 'IT'),
            ('Jane Smith', 'janesmith@outlook.com', 'IT'),
            ('Iosua Finn', 'iosuafinn@outlook.com', 'IT'),
            ('Hannah Sophie', 'hannahsophie@outlook.com', 'IT'),
            ('David Veres', 'davidveres@outlook.com', 'IT'),
            ('Mathias Gombos', 'mathiasgombos@outlook.com', 'IT'),
            ('Roana Suldac', 'roanasuldac@outlook.com', 'IT'),
            ('Saveta Seni', 'savetseni@outlook.com', 'IT'),
            ('Anna Rodriguez', 'annarodriguez@outlook.com', 'IT'),
            ('Joshua Lopez', 'joshualopez@outlook.com', 'IT'),
            ('Andrei Ureche', 'andreiureche@outlook.com', 'NET'),
            ('Simon Pantea', 'simonpantea@outlook.com', 'NET'),
            ('Matthew Garcia', 'matthewgarcia@outlook.com', 'NET'),
            ('Alimi Assimov', 'alimiassimov@outlook.com', 'NET'),
            ('Ema Muthi', 'emamuthi@outlook.com', 'NET'),
            ('Sarah Wilson', 'sarahwilson@outlook.com', 'NET'),
            ('David Ichim', 'davidichim@outlook.com', 'NET'),
            ('Kristin White', 'kristinwhite@outlook.com', 'NET'),
            ('Emily Davis', 'emilydavis@outlook.com', 'NET'),
            ('Nelu Juratoni', 'nelujuratoni@outlook.com', 'NET'),
            ('Shelby Benson', 'shelbybenson@outlook.com', 'Produktion'),
            ('Omar Grant', 'omarg@outlook.com', 'Produktion'),
            ('Rachel Nelson', 'rachelnelson@outlook.com', 'Produktion'),
            ('Miguel Dumitru', 'migueldumitru@outlook.com', 'Produktion'),
            ('Damaris Seni', 'damarisseni@outlook.com', 'Produktion'),
            ('Ilie Ureche', 'ilieureche@outlook.com', 'Produktion'),
            ('David Brown', 'davidbrown@outlook.com', 'Produktion'),
            ('Lois Gagea', 'loisgagea@outlook.com', 'Produktion'),
            ('Laura Thompson', 'laurathompson@outlook.com', 'Produktion'),
            ('Janice Scott', 'janicescott@outlook.com', 'Produktion');
        `;
        await connection.query(personsQuery);

        // Einfügen von Keywords
        const keywordsQuery = `
            INSERT INTO Keywords (name, control, department) VALUES
            ('Database Backup', 'daily', 'IT'),
            ('Server Maintenance', 'weekly_firstworkday', 'IT'),
            ('Application Updates', 'daily', 'IT'),
            ('Network Security Audit', 'weekly_firstworkday', 'IT'),
            ('User Account Management', 'daily', 'IT'),
            ('Disk Space Monitoring', 'weekly_firstworkday', 'IT'),
            ('System Performance Check', 'daily', 'IT'),
            ('Software License Compliance', 'weekly_firstworkday', 'IT'),
            ('Daria', 'daily', 'IT'),
            ('IT Asset Inventory', 'weekly_firstworkday', 'IT'),
            ('Bandwidth Monitoring', 'daily', 'NET'),
            ('Firewall Rules Review', 'weekly_firstworkday', 'NET'),
            ('VPN Configuration', 'daily', 'NET'),
            ('Network Security Assessment', 'weekly_firstworkday', 'NET'),
            ('Switch Configuration Check', 'daily', 'NET'),
            ('Router Firmware Update', 'weekly_firstworkday', 'NET'),
            ('Network Backup Verification', 'daily', 'NET'),
            ('IP Address Management', 'weekly_firstworkday', 'NET'),
            ('Work Safety Training', 'daily', 'Produktion'),
            ('Equipment Calibration', 'weekly_firstworkday', 'Produktion'),
            ('Daily Safety Equipment Check', 'daily', 'Produktion'),
            ('Production Line Inspection', 'weekly_firstworkday', 'Produktion'),
            ('Safety Equipment Check', 'daily', 'Produktion'),
            ('Raw Materials Inventory', 'weekly_firstworkday', 'Produktion'),
            ('Maintenance Logs Review', 'daily', 'Produktion'),
            ('Compliance Inspection', 'weekly_firstworkday', 'Produktion'),
            ('Quality Assurance', 'daily', 'Produktion');
        `;
        await connection.query(keywordsQuery);

        // Zuweisung von Personen zu Keywords
        const responsibilitiesQuery = `
            INSERT INTO Keyword_Person_Responsibilities (keyword_id, person_id) VALUES
            (1, 1), (1, 4), (2, 2), (2, 10), (2, 8),
            (3, 3), (3, 2), (3, 5), (4, 4), (4, 6),
            (5, 5), (5, 1), (5, 7), (5, 9), (6, 6),
            (7, 7), (7, 1), (8, 8), (8, 4), (8, 3),
            (8, 6), (8, 2), (9, 9), (9, 6), (10, 10),
            (11, 11), (11, 15), (11, 19), (12, 12), (12, 11),
            (12, 20), (13, 13), (14, 14), (14, 17), (15, 15),
            (15, 14), (15, 12), (15, 13), (16, 16), (17, 17),
            (17, 20), (18, 18), (18, 19), (18, 15), (19, 21),
            (19, 30), (20, 22), (20, 29), (20, 27), (21, 23),
            (21, 26), (22, 24), (22, 25), (22, 28), (23, 25),
            (24, 26), (24, 24), (25, 27), (25, 29), (26, 28),
            (26, 25), (27, 29), (27, 30);
        `;
        await connection.query(responsibilitiesQuery);

        // Einfügen von Checks (set on false)
        const checksQuery = `
            INSERT INTO Checks (date, state, isChecked, department) VALUES
            ('16.08.2024', 'Completed', FALSE, 'IT'),
            ('16.08.2024', 'Pending', FALSE, 'NET'),
            ('16.08.2024', 'In Progress', FALSE, 'Produktion');
        `;
        await connection.query(checksQuery);

        const checkKeywordQuery = `
            INSERT INTO Check_Keyword (check_id, keyword_id) VALUES
            (1, 1), (1, 2), (1, 3), (1, 4), (1, 5), (1, 6), (1, 7), (1, 8), (1, 9), (1, 10), 
            (2, 11), (2, 12), (2, 13), (2, 14), (2, 15), (2, 16), (2, 17), (2, 18), 
            (3, 18), (3, 19), (3, 20), (3, 21), (3, 22), (3, 23), (3, 24), (3, 25), (3, 26), (3, 27)
        `;
        await connection.query(checkKeywordQuery);

        // Commit der Transaktion
        await connection.commit();
        logger.info('Demo data successfully inserted.');
    } catch (err) {
        if (connection) await connection.rollback();
        logger.error('Error while filling demo data:', err);
    } finally {
        if (connection) {
            await connection.end(); // Verbindung schließen
        }
    }
}

// Script ausführen
fillDemoData().catch((err) => {
    logger.error('Unhandled error in fillDemoData:', err);
});
