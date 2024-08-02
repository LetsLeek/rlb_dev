"use strict";

/* ***************** IMPORT packages *********************** */
const express = require("express");
const http = require("http");
const path = require("path");
const jwt = require('jsonwebtoken');

/* ***************** IMPORT LIBS *************************** */
const { logger } = require("./logging/log");
const DEFAULTS = require("./config/defaults.json");

/* ***************** IMPORT AUTH *************************** */
const {
  ROLE_WORKER,
  ROLE_SUPER_WORKER,
  ROLE_ADMIN,
  hasRole,
} = require("./auth/auth");

/* ***************** IMPORT SCHEDULER *************************** */
require('./scheduler/scheduler'); // Hier wird der Scheduler importiert

/* ***************** IMPORT MIDDLEWARES ******************** */
// const { createAuthJWTMiddleware } = require("./middlewares/auth-jwt-entraid");
// const { restrictToRoles } = require("./middlewares/restrict-to-roles");
// const { errorHandler } = require("./middlewares/error-handling");

/* ***************** IMPORT REQUEST-HANDLER **************** */
const keywordHandler = require("./api/keyWord/keyword-handlers");
const personHandler = require("./api/persons/person-handlers");
const checkHandler = require("./api/checks/check-handlers");
const mailHandler = require("./api/mails/mail-handlers");

/* ***************** CONFIG and CONSTS ********************* */
const HOSTNAME = "0.0.0.0";
const PORT = process.env.PORT || DEFAULTS.PORT;
const secret = 'secret_key'; //TODO Secret key name bestimmen

/* ***************** START UP ******************************* */
logger.info("Backend - Starting configuration...");

const app = express();
app.use(
  express.json({ type: ["application/json", "application/merge-patch+json"] })
);

// use dist/browser folder of Angular build as static directory
app.use(express.static(path.join(__dirname, "client", "dist", "browser")));

// Authentication endpoint
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  const user = persons.find(p => p.email === email && p.password == password);

  if (user) {
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, department: user.department },
      secret
      // { expiresIn: 1h }
    );
    res.json({ token });
  } else {
    res.status(401).send('Email or password incorrect');
  }
});

// Middleware to check JWT and ROLES
function authJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split('')[1];
    jwt.verify(token, secret, (err, user) => {
      if (err) {
        return res.sendStatus(403);
      }
      req.user = user;
      next();
    });
  } else {
    res.sendStatus(401);
  }
}

// Middleware to restrict specific ROLE
function restrictTo(...roles) {
  return (req, res, next) => {
    if (hasRole(req.user, ...roles)) {
      next();
    } else {
      res.sendStatus(403);
    }
  };
}

//=========================== register all endpoints

/******************  KEYWORDS  ******************/
app.get("/api/keywords", keywordHandler.getAll);
app.get("/api/keywords?dep=NET", keywordHandler.getAll);
app.get("/api/keywords?dep=IT", keywordHandler.getAll);
app.get("/api/keywords?dep=PROD", keywordHandler.getAll);
app.post("/api/keywords", keywordHandler.create);
app.put("/api/keywords/:id", keywordHandler.updateById);

/******************  PERSONS  ******************/
app.get("/api/persons", personHandler.getAll);

/******************  CHECKS  ******************/
app.get("/api/checks/it", checkHandler.getAllChecksIT);
app.get("/api/checks/prod", checkHandler.getAllChecksPROD);
app.get("/api/checks/net", checkHandler.getAllChecksNET);
app.get("/api/checks/:id", checkHandler.getById);
app.post("/api/checks/it", checkHandler.createCheckIT);
app.post("/api/checks/prod", checkHandler.createCheckPROD);
app.post("/api/checks/net", checkHandler.createCheckNET);

/******************  MAILS  ******************/
app.get("/api/mails", mailHandler.getAll);
app.get("/api/mails/:id", mailHandler.getById);

// register catch-all route to handle client-side routing with index.html
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "client", "dist", "browser", "index.html"));
});

// create HTTP server
logger.info("Backend - Starting up ...");
const httpServer = http.createServer(app);

// start listening to HTTP requests
httpServer.listen(PORT, HOSTNAME, () => {
  logger.info(`Backend - Running on port ${PORT}...`);
});

module.exports = httpServer;
