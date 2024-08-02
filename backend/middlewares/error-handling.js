const { logger } = require('../logging/log');


function BadRequest(msg, innerErr) {
  this.status = 400;
  this.message = msg;
  this.details = innerErr?.message;
  this.innerErr = innerErr;
}

function NotFound(msg) {
  this.status = 404;
  this.message = msg;
  this.details = '-';
}

function PreConditionFailed(msg) {
  this.status = 412;
  this.message = msg;
  this.details = '-';
}

function UnsupportedMediaType(msg) {
  this.status = 415;
  this.message = msg;
  this.details = '-';
}

function InternalServerError(innerErr) {
  this.status = 500;
  this.message = 'Unexpected';
  this.innerErr = innerErr;
}


const errorHandler = (error, req, resp, _next) => {
  error.status = error.status || 500;
  error.message = error.message || 'Internal server error';
  error.details = error.details || 'Unexpected';
  error.instance = error.instance || req.path;
  error.method = error.method || req.method;

  log({ ...error });

  resp.header("Content-Type", 'application/json');

  delete error.innerErr;
  resp.status(error.status).json(error);
}

const log = (err) => {
  if (err.status >= 300 && err.status < 500 && process.env.NODE_ENV !== 'production') {
    logger.debug(JSON.stringify(err));
  } else {
    logger.error(JSON.stringify(err));
    logger.error(err?.innerErr?.stack);
  }
}

module.exports = {
  errorHandler,
  BadRequest, NotFound, PreConditionFailed, UnsupportedMediaType,
  InternalServerError
}