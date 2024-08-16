const { getConnection } = require("../../db/database");
const { logger } = require("../../logging/log");
const fs = require("fs").promises;
const mysql = require('mysql2/promise');

const Holidays = require("date-holidays");
const hd = new Holidays("AT", "2"); //AT = Austria , 2 = Carinthia

// Helper Funktion zum Erhalten des Wochentagsnamens
const getDayName = (dayIndex) => {
  const days = [
    "Sonntag",
    "Montag",
    "Dienstag",
    "Mittwoch",
    "Donnerstag",
    "Freitag",
    "Samstag",
  ];
  return days[dayIndex];
};

// Helper Funktion für Feiertags- und Wochenend-Berechnung
const getRemarkAndStateForDate = (date) => {
  const holiday = hd.isHoliday(date);
  const dayOfWeek = date.getDay();

  if (holiday) {
    return { remark: "HOLIDAY", state: holiday[0].name || "Feiertag" };
  } else if (dayOfWeek === 0 || dayOfWeek === 6) {
    // 0 für Sonntag, 6 für Samstag
    return { remark: "WEEKEND", state: getDayName(dayOfWeek) };
  } else {
    return {remark: "", state: "In Progress"};
  }
};

// Funktion zur Formatierung des Datums im Format DD.MM.YYYY HH:mm:ss
async function formateCurrentDate(date) {
  const day = date.getDate().toString().padStart(2, "0"); // Tag (z.B. 31)
  const month = (date.getMonth() + 1).toString().padStart(2, "0"); // Monat (Zahlenbereich 1-12)
  const year = date.getFullYear(); // Jahr (z.B. 2024)
  // const hours = date.getHours().toString().padStart(2, "0"); // Stunden (Zahlenbereich 0-23)
  // const minutes = date.getMinutes().toString().padStart(2, "0"); // Minuten (Zahlenbereich 0-59)
  // const seconds = date.getSeconds().toString().padStart(2, "0"); // Sekunden (Zahlenbereich 0-59)

  return `${day}.${month}.${year}`;
}

// Die aktualisierte postObject-Funktion
const postObjects = async () => {
  let connection;

  try {
      // Verbindung zur Datenbank herstellen
      connection = await getConnection();

      if (!connection) {
          throw new Error('No database connection available.');
      }

      // "currentDate" und "nextDay" bleiben unverändert
      const currentDate = new Date();
      const nextDay = new Date(currentDate);
      nextDay.setDate(currentDate.getDate() + 1);
      const formattedDate = await formateCurrentDate(nextDay);
      const remarkAndState = getRemarkAndStateForDate(nextDay);

      // Erhalte alle Keywords aus der Datenbank
      const [rows] = await connection.execute('SELECT * FROM Keywords');
      const keywordsIT = rows.filter((keyword) => keyword.department === "IT");
      const keywordsPROD = rows.filter((keyword) => keyword.department === "Produktion");
      const keywordsNET = rows.filter((keyword) => keyword.department === "NET");

      // Erstelle neue Check-Objekte
      const insertCheck = async (body) => {
          const [result] = await connection.query(
              'INSERT INTO Checks (date, state, isChecked, remark, department) VALUES (?, ?, ?, ?, ?)',
              [body.date, body.state, body.isChecked, body.remark, body.department]
          );
          return result.insertId; // Die ID des neu eingefügten Checks
      };

      const itCheckId = await insertCheck({
          date: formattedDate,
          state: remarkAndState.state,
          isChecked: false,
          remark: remarkAndState.remark,
          department: "IT"
      });

      const prodCheckId = await insertCheck({
          date: formattedDate,
          state: remarkAndState.state,
          isChecked: false,
          remark: remarkAndState.remark,
          department: "Produktion"
      });

      const netCheckId = await insertCheck({
          date: formattedDate,
          state: remarkAndState.state,
          isChecked: false,
          remark: remarkAndState.remark,
          department: "NET"
      });

      // Füge die Keywords zu den Checks hinzu
      const insertKeywords = async (checkId, keywords) => {
          if (keywords.length > 0) {
              const values = keywords.map(keyword => [checkId, keyword.id]);
              await connection.query(
                  'INSERT INTO Check_Keyword (check_id, keyword_id) VALUES ?',
                  [values]
              );
          }
      };

      await insertKeywords(itCheckId, keywordsIT);
      await insertKeywords(prodCheckId, keywordsPROD);
      await insertKeywords(netCheckId, keywordsNET);
  } catch (err) {
      logger.error("Error processing the request:", err);
  }
};
  

// Die create-Funktion für das Erstellen eines neuen Checks (IT)
const createCheck = async (req, res, next) => {
  let connection;

  try {
      // Verbindung zur Datenbank herstellen
      connection = await getConnection();

      if (!connection) {
          throw new Error('No database connection available.');
      }

      // Department aus der Anfrage extrahieren
      const department = req.body.department;
      if (!department) {
          return res.status(400).send('Department is required');
      }

      // Erhalte alle Keywords für das angegebene Department
      const [keywordRows] = await connection.execute('SELECT * FROM Keywords WHERE department = ?', [department]);
      const currKeywords = keywordRows;

      // Erzeuge das Datum für den nächsten Tag
      const currentDate = new Date();
      const nextDay = new Date(currentDate);
      nextDay.setDate(currentDate.getDate() + 1);
      const formattedDate = await formateCurrentDate(nextDay);

      // Holen des Remarks und State für das Datum
      const remarkAndState = getRemarkAndStateForDate(nextDay);

      // Neuen Check erstellen
      let newCheck = req.body;
      newCheck.date = formattedDate;
      newCheck.isChecked = false;
      newCheck.remark = remarkAndState.remark;
      newCheck.state = remarkAndState.state;

      // Check in die Datenbank einfügen
      const [result] = await connection.query(
          'INSERT INTO Checks (date, state, isChecked, remark, department) VALUES (?, ?, ?, ?, ?)',
          [newCheck.date, newCheck.state, newCheck.isChecked, newCheck.remark, newCheck.department]
      );

      const newCheckId = result.insertId; // Die ID des neu eingefügten Checks

      // Keywords zu dem Check hinzufügen
      if (currKeywords.length > 0) {
          const values = currKeywords.map(keyword => [newCheckId, keyword.id]);
          await connection.query(
              'INSERT INTO Check_Keyword (check_id, keyword_id) VALUES ?',
              [values]
          );
      }

      res.status(201).send('Check successfully created');
  } catch (err) {
      logger.error('Error creating check:', err);
      res.status(500).send('Internal Server Error');
  }
};

const getAllChecks = async (req, res) => {
  let connection;

  try {
    // Verbindung zur Datenbank herstellen
    connection = await getConnection();

    if (!connection) {
      throw new Error('No database connection available.');
    }

    // Department aus der Anfrage extrahieren
    const department = req.query.department;
    if (!department) {
      return res.status(400).send('Department is required');
    }

    // Abruf der Checks für das angegebene Department
    const [checks] = await connection.query(`
      SELECT 
        id,
        date,
        state,
        isChecked,
        remark,
        department
      FROM Checks
      WHERE department = ?
    `, [department]);

    // Falls keine Checks gefunden werden, gibt eine leere Antwort zurück
    if (checks.length === 0) {
      return res.json([]);
    }

    // Abruf der Keywords für die Checks
    const checkIds = checks.map(check => check.id);
    const [checkKeywords] = await connection.query(`
      SELECT 
        ck.check_id,
        k.id AS keyword_id,
        k.name AS keyword,
        k.control,
        k.checkedByPersonId,
        k.checkedByDate
      FROM Check_Keyword ck
      JOIN Keywords k ON ck.keyword_id = k.id
      WHERE ck.check_id IN (?)
    `, [checkIds]);

    // Abruf der verantwortlichen Personen für die Keywords
    const keywordIds = checkKeywords.map(keyword => keyword.keyword_id);
    const [keywordPersons] = await connection.query(`
      SELECT 
        kpr.keyword_id,
        p.id AS person_id,
        p.name AS person_name,
        p.email AS person_email
      FROM keyword_person_responsibilities kpr
      JOIN Persons p ON kpr.person_id = p.id
      WHERE kpr.keyword_id IN (?)
    `, [keywordIds]);

    // Strukturierung der Daten
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

    // Abruf der Check-Details für die verantwortlichen Personen
    const [persons] = await connection.query(`
      SELECT 
        id,
        name,
        email
      FROM Persons
      WHERE id IN (SELECT DISTINCT checkedByPersonId FROM Keywords WHERE checkedByPersonId IS NOT NULL)
    `);

    // Strukturierung der Keywords nach Check
    const checkKeywordMap = checkKeywords.reduce((acc, { check_id, keyword_id, keyword, control, checkedByPersonId, checkedByDate }) => {
      if (!acc[check_id]) {
        acc[check_id] = [];
      }
      acc[check_id].push({
        id: keyword_id,
        name: keyword,
        department: department,
        control: control,
        responsiblePersons: keywordPersonMap[keyword_id] || [],
        checkedBy: {
          person: persons.find(person => person.id === checkedByPersonId) || null,
          date: checkedByDate || null
        }
      });
      return acc;
    }, {});

    // Strukturierung der Daten
    const result = checks.map(check => {
      return {
        ...check,
        keyWords: checkKeywordMap[check.id] || []
      };
    });

    res.json(result);
  } catch (err) {
    logger.error('Error retrieving checks:', err);
    res.status(500).send('Internal Server Error');
  }
};


const getById = async (req, res) => {
  try {
    let department = req.query.dep;
    const id = parseInt(req.params.id);

    // Überprüfe, ob die Abteilung und ID gültig sind
    if (!department) {
      return res.status(400).json({ error: 'Department is required' });
    }

    department = department.toUpperCase() === 'PRODUKTION' ? 'Produktion' : department.toUpperCase();

    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    // Verbindungsaufbau zur Datenbank
    const connection = await getConnection();
    if (!connection) {
      throw new Error('No database connection available.');
    }

    // Abfrage, um den Check zu finden
    const [checkRows] = await connection.query(
      `
      SELECT c.id, c.date, c.state, c.isChecked, c.remark, c.department
      FROM Checks c
      WHERE c.id = ? AND c.department = ?
      `,
      [id, department]
    );

    if (checkRows.length === 0) {
      return res.status(404).json({ error: 'Check not found' });
    }

    const check = checkRows[0];

    // Abruf der Keywords für den spezifischen Check
    const [checkKeywords] = await connection.query(
      `
      SELECT 
        ck.check_id,
        k.id AS keyword_id,
        k.name AS keyword_name,
        k.control,
        k.checkedByPersonId,
        k.checkedByDate
      FROM Check_Keyword ck
      JOIN Keywords k ON ck.keyword_id = k.id
      WHERE ck.check_id IN (?)
      `,
      [id]
    );

    // Abruf der verantwortlichen Personen für die Keywords
    const keywordIds = checkKeywords.map(keyword => keyword.keyword_id);
    const [keywordPersons] = await connection.query(
      `
      SELECT 
        kpr.keyword_id,
        p.id AS person_id,
        p.name AS person_name,
        p.email AS person_email
      FROM keyword_person_responsibilities kpr
      JOIN Persons p ON kpr.person_id = p.id
      WHERE kpr.keyword_id IN (?)
      `,
      [keywordIds]
    );

    // Abruf der Personen, die den Keyword-Check durchgeführt haben
    const [persons] = await connection.query(
      `
      SELECT 
        id,
        name,
        email
      FROM Persons
      WHERE id IN (SELECT DISTINCT checkedByPersonId FROM Keywords WHERE checkedByPersonId IS NOT NULL)
      `
    );

    // Strukturierung der verantwortlichen Personen für jedes Keyword
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

    // Strukturierung der Keywords nach Check
    check.keyWords = checkKeywords.map(({ keyword_id, keyword_name, control, checkedByPersonId, checkedByDate }) => ({
      id: keyword_id,
      name: keyword_name,
      department: department,
      control: control,
      responsiblePersons: keywordPersonMap[keyword_id] || [],
      checkedBy: {
        person: persons.find(person => person.id === checkedByPersonId) || null,
        date: checkedByDate || null
      }
    }));

    res.json(check);
  } catch (err) {
    logger.error('Error finding/parsing/reading the (searched check)/file:', err);
    res.status(500).send('Internal Server Error');
  }
};

  const formatDateFromISO = (isoDate) => {
    const date = new Date(isoDate);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    // const hours = date.getHours().toString().padStart(2, '0');
    // const minutes = date.getMinutes().toString().padStart(2, '0');
    // const seconds = date.getSeconds().toString().padStart(2, '0');
  
    return `${day}.${month}.${year}`;
  };
  
  
  const getCheckByDate = async (req, res) => {
    try {
      let department = req.query.dep;
      let isoDate = req.params.date;
  
      // Überprüfe, ob die Abteilung und das Datum gültig sind
      if (!department) {
        return res.status(400).json({ error: 'Department is required' });
      }
      
      department = department.toUpperCase() === 'PRODUKTION' ? 'Produktion' : department.toUpperCase();
  
      if (!isoDate) {
        return res.status(400).json({ error: 'Date is required' });
      }
  
      // Konvertiere das ISO-Datum in das gewünschte Format
      const formattedDate = formatDateFromISO(isoDate).split(' ')[0]; // Nur das Datum, keine Uhrzeit
  
      // Verbindungsaufbau zur Datenbank
      const connection = await getConnection();
      if (!connection) {
        throw new Error('No database connection available.');
      }
  
      // Abfrage, um den Check basierend auf dem Datum und der Abteilung zu finden
      const [checkRows] = await connection.query(
        `
        SELECT c.id, c.date, c.state, c.isChecked, c.remark, c.department
        FROM Checks c
        WHERE c.date = ? AND c.department = ?
        `,
        [formattedDate, department]
      );
  
      if (checkRows.length === 0) {
        return res.status(404).json({ error: 'Check not found' });
      }
  
      const check = checkRows[0];
  
      // Abruf der Keywords für den spezifischen Check
      const [checkKeywords] = await connection.query(
        `
        SELECT 
          ck.check_id,
          k.id AS keyword_id,
          k.name AS keyword_name,
          k.control,
          k.checkedByPersonId,
          k.checkedByDate
        FROM Check_Keyword ck
        JOIN Keywords k ON ck.keyword_id = k.id
        WHERE ck.check_id = ?
        `,
        [check.id]
      );
  
      // Abruf der verantwortlichen Personen für die Keywords
      const keywordIds = checkKeywords.map(keyword => keyword.keyword_id);
      const [keywordPersons] = await connection.query(
        `
        SELECT 
          kpr.keyword_id,
          p.id AS person_id,
          p.name AS person_name,
          p.email AS person_email
        FROM keyword_person_responsibilities kpr
        JOIN Persons p ON kpr.person_id = p.id
        WHERE kpr.keyword_id IN (?)
        `,
        [keywordIds]
      );
  
      // Abruf der Personen, die den Keyword-Check durchgeführt haben
      const [persons] = await connection.query(
        `
        SELECT 
          id,
          name,
          email
        FROM Persons
        WHERE id IN (SELECT DISTINCT checkedByPersonId FROM Keywords WHERE checkedByPersonId IS NOT NULL)
        `
      );
  
      // Strukturierung der verantwortlichen Personen für jedes Keyword
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
  
      // Strukturierung der Keywords nach Check
      check.keyWords = checkKeywords.map(({ keyword_id, keyword_name, control, checkedByPersonId, checkedByDate }) => ({
        id: keyword_id,
        name: keyword_name,
        department: department,
        control: control,
        responsiblePersons: keywordPersonMap[keyword_id] || [],
        checkedBy: {
          person: persons.find(person => person.id === checkedByPersonId) || null,
          date: checkedByDate || null
        }
      }));
  
      res.json(check);
    } catch (err) {
      logger.error('Error finding/parsing/reading the (searched check)/file:', err);
      res.status(500).send('Internal Server Error');
    }
  };// TODO testen ob es geht
  

  const createSetClause = (data) => {
    return Object.keys(data)
      .filter(key => data[key] !== null && data[key] !== undefined)
      .map(key => `${mysql.escapeId(key)} = ?`)
      .join(', ');
  };

  const updateCheck = async (req, res) => {
    let connection;
  
    try {
      const { dep, id } = req.query;
      const updatedData = req.body;
  
      // Überprüfe, ob die Abteilung und ID gültig sind
      if (!dep || !id) {
        return res.status(400).json({ error: 'Department and ID are required' });
      }
  
      const department = dep.toUpperCase() === 'PRODUKTION' ? 'prod' : dep.toUpperCase();
      const checkId = parseInt(id);

      const updatedCheck = {
        id: checkId, // ID darf nicht geändert werden
        department: department // Department darf nicht geändert werden
      };

      if (isNaN(checkId)) {
        return res.status(400).json({ error: 'Invalid ID' });
      }

      if (updatedData.date) updatedCheck.date = updatedData.date;
      if (updatedData.state) updatedCheck.state = updatedData.state;
      if (updatedData.isChecked) updatedCheck.isChecked = updatedData.isChecked;
      if (updatedData.remark) updatedCheck.remark = updatedData.remark;
  
      // Stelle die Verbindung zur Datenbank her
      connection = await getConnection();
  
      // Aktualisiere Check-Daten in der Datenbank
      // Aktualisiere Check-Daten in der Datenbank
      const setClause = createSetClause(updatedCheck);
      const [results] = await connection.execute(
        `UPDATE checks SET ${setClause} WHERE id = ? AND department = ?`,
        [...Object.values(updatedCheck), checkId, department]
      );

      // Holen Sie sich die aktuellen Keywords für diesen Check
      const [currentKeywords] = await connection.execute(
        `SELECT keyword_id FROM check_keyword WHERE check_id = ?`,
        [checkId]
      );
      const existingKeywordIds = new Set(currentKeywords.map(row => row.keyword_id));

      // Entfernen Sie Keywords, die nicht mehr in den aktualisierten Daten vorhanden sind
      const updatedKeywordIds = new Set(updatedData.keyWords.map(keyword => keyword.id));
      const keywordsToDelete = [...existingKeywordIds].filter(id => !updatedKeywordIds.has(id));

      if (keywordsToDelete.length > 0) {
        await connection.execute(
          `DELETE FROM check_keyword WHERE check_id = ? AND keyword_id IN (?)`,
          [checkId, [keywordsToDelete]]
        );
      }
  
      if (results.affectedRows === 0) {
        return res.status(404).json({ error: 'Check not found or no update performed' });
      }

      // Fügen Sie neue Keywords hinzu, die noch nicht vorhanden sind
      const keywordsToAdd = updatedData.keyWords.filter(keyword => !existingKeywordIds.has(keyword.id));
      if (keywordsToAdd.length > 0) {
        const keywordValues = keywordsToAdd.map(keyword => [checkId, keyword.id]);
        await connection.execute(
          `INSERT INTO check_keyword (check_id, keyword_id) VALUES ?`,
          [keywordValues]
        );
      }

      // Verwalten Sie die Verantwortlichen Personen für jedes Keyword
    for (const keyword of updatedData.keyWords) {
      const keywordId = keyword.id;
      const responsiblePersons = keyword.responsiblePersons || [];

      // Löschen Sie die bestehenden Verantwortlichen Personen für dieses Keyword
      await connection.execute(
        `DELETE FROM keyword_person_responsibilities WHERE keyword_id = ?`,
        [keywordId]
      );

      // Fügen Sie die neuen Verantwortlichen Personen hinzu
    if (responsiblePersons.length > 0) {
      const responsibilities = responsiblePersons.map(person => `(${keywordId}, ${person.id})`).join(', ');
      const insertQuery = `INSERT INTO keyword_person_responsibilities (keyword_id, person_id) VALUES ${responsibilities}`;

      await connection.execute(insertQuery);
    }


      // Wenn das Keyword ein "checkedBy" Attribut enthält, aktualisiere es
      if (keyword.checkedBy && (keyword.checkedBy.person != null || keyword.checkedBy.date != null)) {
        await connection.execute(
          `UPDATE keywords SET checkedByPersonId = ?, checkedByDate = ? WHERE id = ? AND department = ?`,
          [keyword.checkedBy.person.id, keyword.checkedBy.date, keywordId, department]
        );
      }
    }
  
      res.status(200).send('Check successfully updated');
    } catch (err) {
      console.error('Error updating the check:', err);
      res.status(500).send('Internal Server Error');
    }
  };
  

module.exports = {
  getAllChecks,
  createCheck,
  getById,
  postObjects,
  getCheckByDate,
  updateCheck  
};
