const CronJob = require('cron').CronJob;
const checkHandler = require('../api/checks/check-handlers');

// Funktion, die ausgeführt werden soll
function createNextDayCheck() {
  console.log(new Date().toLocaleDateString());

  // Logik für die Erstellung des Checks für den nächsten Tag
  checkHandler.postObjects()
    .then(() => {
      console.log('Checks successfully created');
    })
    .catch(err => {
      console.error('Error creating checks:', err);
    });
}

// Für Testzwecke: Erstelle einen neuen Cron-Job, der jede Minute ausgeführt wird
const job = new CronJob('20 14 * * *', createNextDayCheck, null, true, 'Europe/Berlin'); //TODO auf 18 Uhr anpassen

// Starte den Cron-Job
job.start();
