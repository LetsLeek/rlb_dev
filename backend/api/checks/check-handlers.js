const { logger } = require("../../logging/log");
const fs = require("fs").promises;
const { getAllKeywords } = require("../keyWord/keyword-handlers");

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
    return { remark: "HOLIDAY", state: holiday.name };
  } else if (dayOfWeek === 0 || dayOfWeek === 6) {
    // 0 für Sonntag, 6 für Samstag
    return { remark: "WEEKEND", state: getDayName(dayOfWeek) };
  } else {
    return { remark: getDayName(dayOfWeek), state: "" };
  }
};

// Funktion zur Formatierung des Datums im Format DD.MM.YYYY HH:mm:ss
async function formateCurrentDate(date) {
  const day = date.getDate().toString().padStart(2, "0"); // Tag (z.B. 31)
  const month = (date.getMonth() + 1).toString().padStart(2, "0"); // Monat (Zahlenbereich 1-12)
  const year = date.getFullYear(); // Jahr (z.B. 2024)
  const hours = date.getHours().toString().padStart(2, "0"); // Stunden (Zahlenbereich 0-23)
  const minutes = date.getMinutes().toString().padStart(2, "0"); // Minuten (Zahlenbereich 0-59)
  const seconds = date.getSeconds().toString().padStart(2, "0"); // Sekunden (Zahlenbereich 0-59)

  return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;
}

// Die aktualisierte postObject-Funktion
const postObjects = async (req, res) => {
    try {
      // Lies die Daten für jede Abteilung
      let arrIT = await readChecksFile('IT');
      let arrPROD = await readChecksFile('Produktion');
      let arrNET = await readChecksFile('NET');
  
      // Erstelle neue Check-Objekte
      let bodyIT = {
        date: "",
        state: "",
        isChecked: false,
        keyWords: [],
        remark: "",
        department: "IT",
      };
  
      let bodyPROD = {
        date: "",
        state: "",
        isChecked: false,
        keyWords: [],
        remark: "",
        department: "Produktion",
      };
  
      let bodyNET = {
        date: "",
        state: "",
        isChecked: false,
        keyWords: [],
        remark: "",
        department: "NET",
      };
  
      const currKeywords = await getAllKeywords();
      const keywordsIT = currKeywords.filter((keyword) => keyword.department == "IT");
      const keywordsPROD = currKeywords.filter((keyword) => keyword.department == "Produktion");
      const keywordsNET = currKeywords.filter((keyword) => keyword.department == "NET");
  
      const currentDate = new Date();
      const nextDay = new Date(currentDate);
      nextDay.setDate(currentDate.getDate() + 1);
  
      const formattedDate = await formateCurrentDate(nextDay);
      const remarkAndState = getRemarkAndStateForDate(nextDay);
  
      // IT
      let newITCheck = { ...bodyIT, date: formattedDate, isChecked: false, keyWords: keywordsIT, id: arrIT.length, remark: remarkAndState.remark, state: remarkAndState.state };
      arrIT.push(newITCheck);
  
      // Produktion
      let newPRODCheck = { ...bodyPROD, date: formattedDate, isChecked: false, keyWords: keywordsPROD, id: arrPROD.length, remark: remarkAndState.remark, state: remarkAndState.state };
      arrPROD.push(newPRODCheck);
  
      // NET
      let newNETCheck = { ...bodyNET, date: formattedDate, isChecked: false, keyWords: keywordsNET, id: arrNET.length, remark: remarkAndState.remark, state: remarkAndState.state };
      arrNET.push(newNETCheck);
  
      // Schreibe die aktualisierten Daten zurück in die Dateien
      await fs.writeFile("data/checks/checks_it.json", JSON.stringify(arrIT));
      await fs.writeFile("data/checks/checks_prod.json", JSON.stringify(arrPROD));
      await fs.writeFile("data/checks/checks_net.json", JSON.stringify(arrNET));
  
      res.status(201).send("Checks successfully created");
    } catch (err) {
      logger.error("Error processing the request:", err);
      res.status(500).send("Internal Server Error");
    }
  };
  

// Die create-Funktion für das Erstellen eines neuen Checks (IT)
const createCheckIT = async (req, res, next) => {
  try {
    const allKeywords = await getAllKeywords();
    const currKeywords = allKeywords.filter((keyword) => keyword.department == 'IT')

    const currentDate = new Date();
    // Berechnet das Datum für den nächsten Tag
    const nextDay = new Date(currentDate);
    nextDay.setDate(currentDate.getDate() + 1);

    // Formatierung des Datums im Format DD.MM.YYYY HH:mm:ss
    const formattedDate = await formateCurrentDate(nextDay);

    let arr = await getAllChecksIT();
    let newCheck = req.body;

    newCheck.date = formattedDate;
    newCheck.isChecked = false;
    newCheck.keyWords = currKeywords;
    newCheck.department = 'IT'
    newCheck.id = arr.length;

    const remarkAndState = getRemarkAndStateForDate(nextDay);
    newCheck.remark = remarkAndState.remark;
    newCheck.state = remarkAndState.state;

    arr.push(newCheck);
    await fs.writeFile("data/checks/checks_it.json", JSON.stringify(arr));
    res.status(201).send("IT Check successfully created");
  } catch (err) {
    logger.error("Error reading or parsing the file:", err);
    res.status(500).send("Internal Server Error");
  }
};

// Die create-Funktion für das Erstellen eines neuen Checks (IT)
const createCheckPROD = async (req, res, next) => {
    try {
        const allKeywords = await getAllKeywords();
        const currKeywords = allKeywords.filter((keyword) => keyword.department == 'Produktion')
    
        const currentDate = new Date();
        // Berechnet das Datum für den nächsten Tag
        const nextDay = new Date(currentDate);
        nextDay.setDate(currentDate.getDate() + 1);
    
        // Formatierung des Datums im Format DD.MM.YYYY HH:mm:ss
        const formattedDate = await formateCurrentDate(nextDay);
    
        let arr = await getAllChecksPROD();
        let newCheck = req.body;
    
        newCheck.date = formattedDate;
        newCheck.isChecked = false;
        newCheck.keyWords = currKeywords;
        newCheck.department = 'Produktion'
        newCheck.id = arr.length;
    
        const remarkAndState = getRemarkAndStateForDate(nextDay);
        newCheck.remark = remarkAndState.remark;
        newCheck.state = remarkAndState.state;
    
        arr.push(newCheck);
        await fs.writeFile("data/checks/checks_prod.json", JSON.stringify(arr));
        res.status(201).send("Production Check successfully created");
      } catch (err) {
        logger.error("Error reading or parsing the file:", err);
        res.status(500).send("Internal Server Error");
      }
  };

  // Die create-Funktion für das Erstellen eines neuen Checks (IT)
const createCheckNET = async (req, res, next) => {
    try {
        const allKeywords = await getAllKeywords();
        const currKeywords = allKeywords.filter((keyword) => keyword.department == 'NET')
    
        const currentDate = new Date();
        // Berechnet das Datum für den nächsten Tag
        const nextDay = new Date(currentDate);
        nextDay.setDate(currentDate.getDate() + 1);
    
        // Formatierung des Datums im Format DD.MM.YYYY HH:mm:ss
        const formattedDate = await formateCurrentDate(nextDay);
    
        let arr = await getAllChecksNET();
        let newCheck = req.body;
    
        newCheck.date = formattedDate;
        newCheck.isChecked = false;
        newCheck.keyWords = currKeywords;
        newCheck.department = 'NET'
        newCheck.id = arr.length;
    
        const remarkAndState = getRemarkAndStateForDate(nextDay);
        newCheck.remark = remarkAndState.remark;
        newCheck.state = remarkAndState.state;
    
        arr.push(newCheck);
        await fs.writeFile("data/checks/checks_net.json", JSON.stringify(arr));
        res.status(201).send("NET Check successfully created");
      } catch (err) {
        logger.error("Error reading or parsing the file:", err);
        res.status(500).send("Internal Server Error");
      }
  };

const getAllChecksPROD = async (req, res) => {
    try {
      const data = await fs.readFile("data\\checks\\checks_prod.json");
      const jsonData = JSON.parse(data);
      res.json(jsonData);
    } catch (err) {
      logger.error("Error reading or parsing the file:", err);
      res.status(500).send("Internal Server Error");
    }
  };

  const getAllChecksNET = async (req, res) => {
    try {
      const data = await fs.readFile("data\\checks\\checks_net.json");
      const jsonData = JSON.parse(data);
      res.json(jsonData);
    } catch (err) {
      logger.error("Error reading or parsing the file:", err);
      res.status(500).send("Internal Server Error");
    }
  };

  const getAllChecksIT = async (req, res) => {
    try {
      const data = await fs.readFile("data/checks/checks_it.json");
      const jsonData = JSON.parse(data);
      res.json(jsonData);
    } catch (err) {
      logger.error("Error reading or parsing the file:", err);
      res.status(500).send("Internal Server Error");
    }
  };

const getById = async (req, res) => {
    try {
      let department = req.query.dep;
      let id = parseInt(req.params.id);
  
      // Überprüfe, ob die Abteilung und ID gültig sind
      if (!department) {
        return res.status(400).json({ error: 'Department is required' });
      }
      
      department = department.toUpperCase() === 'PRODUKTION' ? 'prod' : department.toLowerCase();
  
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid ID' });
      }
  
      // Lese die Datei basierend auf der Abteilung
      const data = await fs.readFile(`data/checks/checks_${department}.json`);
      const jsonData = JSON.parse(data);
      const check = jsonData.find((elem) => elem.id === id);
  
      if (!check) {
        return res.status(404).json({ error: 'Check not found' });
      }
  
      res.json(check);
    } catch (err) {
      logger.error("Error finding/parsing/reading the (searched check)/file:", err);
      res.status(500).send("Internal Server Error");
    }
  };

const readChecksFile = async (department) => {
    try {
      let filePath;
      switch (department) {
        case 'IT':
          filePath = "data/checks/checks_it.json";
          break;
        case 'Produktion':
          filePath = "data/checks/checks_prod.json";
          break;
        case 'NET':
          filePath = "data/checks/checks_net.json";
          break;
        default:
          throw new Error("Invalid department");
      }
      const data = await fs.readFile(filePath, "utf8");
      return JSON.parse(data);
    } catch (err) {
      logger.error(`Error reading or parsing the file for department ${department}:`, err);
      throw err;
    }
  };

  const formatDateFromISO = (isoDate) => {
    const date = new Date(isoDate);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
  
    return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;
  };
  
  
  const getCheckByDate = async (req, res) => {
    try {
      let department = req.query.dep;
      let isoDate = req.params.date;
  
      // Überprüfe, ob die Abteilung und das Datum gültig sind
      if (!department) {
        return res.status(400).json({ error: 'Department is required' });
      }
      
      department = department.toUpperCase() === 'PRODUKTION' ? 'prod' : department.toLowerCase();
  
      if (!isoDate) {
        return res.status(400).json({ error: 'Date is required' });
      }
  
      // Konvertiere das ISO-Datum in das gewünschte Format
      const formattedDate = formatDateFromISO(isoDate).split(' ')[0]; // Nur das Datum, keine Uhrzeit
  
      // Lese die Datei basierend auf der Abteilung
      const data = await fs.readFile(`data/checks/checks_${department}.json`);
      const jsonData = JSON.parse(data);
      const check = jsonData.find((elem) => elem.date.startsWith(formattedDate));
  
      if (!check) {
        return res.status(404).json({ error: 'Check not found' });
      }
  
      res.json(check);
    } catch (err) {
      logger.error("Error finding/parsing/reading the (searched check)/file:", err);
      res.status(500).send("Internal Server Error");
    }
  };

  const checkUpdate = async (req, res) => {
    try {
      const { dep, id } = req.query;
      const updatedData = req.body;
  
      // Überprüfe, ob die Abteilung und ID gültig sind
      if (!dep || !id) {
        return res.status(400).json({ error: 'Department and ID are required' });
      }
  
      const department = dep.toUpperCase() === 'PRODUKTION' ? 'prod' : dep.toLowerCase();
      const checkId = parseInt(id);
  
      if (isNaN(checkId)) {
        return res.status(400).json({ error: 'Invalid ID' });
      }
  
      // Lese die Datei basierend auf der Abteilung
      const filePath = `data/checks/checks_${department}.json`;
      const data = await fs.readFile(filePath, "utf8");
      const jsonData = JSON.parse(data);
  
      // Finde den Check mit der angegebenen ID
      const checkIndex = jsonData.findIndex((elem) => elem.id === checkId);
  
      if (checkIndex === -1) {
        return res.status(404).json({ error: 'Check not found' });
      }
  
      // Aktualisiere die Check-Daten
      jsonData[checkIndex] = { ...jsonData[checkIndex], ...updatedData };
  
      // Schreibe die aktualisierten Daten zurück in die Datei
      await fs.writeFile(filePath, JSON.stringify(jsonData, null, 2));
  
      res.status(200).send("Check successfully updated");
    } catch (err) {
      logger.error("Error updating the check:", err);
      res.status(500).send("Internal Server Error");
    }
  };
  

module.exports = {
  getAllChecksIT,
  getAllChecksNET,
  getAllChecksPROD,
  createCheckIT,
  createCheckNET,
  createCheckPROD,
  getById,
  postObjects,
  getCheckByDate,
  checkUpdate  
};
