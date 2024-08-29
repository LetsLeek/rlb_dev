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

// Um 18 wird jedes Mal ein neuer Check erstellt
const job = new CronJob('18 0 * * *', createNextDayCheck, null, true, 'Europe/Berlin'); 

// Starte den Cron-Job
job.start();
