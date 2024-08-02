const jsonwebtoken = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

const { logger } = require('../logging/log');


function createAuthJWTMiddleware(validateToken, tenantId, appId) {

  if (!validateToken)
    logger.warn('AuthJWT - Token validation disabled. only use for non-production-environments and testing purposes');

  if (validateToken && typeof tenantId != 'string')
    throw new Error('Need to provide tenantId when validateToken is true');

  if (validateToken && typeof appId != 'string')
    throw new Error('Need to provide appId when validateToken is true');

  const client = jwksClient({
    jwksUri: `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`
  });

  function lookupSigningKey(header, callback) {
    client.getSigningKey(header.kid, function (err, key) {
      if (err) {
        logger.warn('AuthJWT - Unable to retrieve signing key', err);
        callback(err);
        return;
      }

      var signingKey = key.publicKey || key.rsaPublicKey;
      callback(null, signingKey);
    });
  }

  return (req, resp, next) => {
    const authorizationHdr = req.headers['authorization'];

    if (authorizationHdr && authorizationHdr.startsWith('Bearer ')) {
      const accessToken = authorizationHdr.substring(7);

      // token - null check; if someone is logged out, authorizationHdr is - "Bearer null"
      if (accessToken === 'null') {
        missingToken();
      } else {

        // in production
        if (validateToken) {
          jsonwebtoken.verify(accessToken, lookupSigningKey, {}, (err, decodedToken) => {
            if (!err && decodedToken.aud == appId) {
              req.authenticatedUser = decodedToken.upn;
              req.roles = Array.isArray(decodedToken.roles) ? decodedToken.roles : [];
              req.scp = decodedToken.scp;
              next();
            }
            else {
              invalidToken(err, decodedToken);
            }
          });
        }
        // for local development and testing
        else {
          const decodedToken = jsonwebtoken.decode(accessToken, {});
          if (decodedToken !== null && decodedToken.aud === appId) {
            req.authenticatedUser = decodedToken.upn;
            req.roles = Array.isArray(decodedToken.roles) ? decodedToken.roles : [];
            req.scp = decodedToken.scp;
            next();
          }
          else {
            invalidToken(null, decodedToken);
          };
        }
      }
    }
    else {
      missingToken();
    }

    function missingToken() {
      logger.debug('AuthJWT - Unauthorized access attempt - no Bearer token specified');
      resp.status(401).type(`text`).send(`Missing token`);
    }

    function invalidToken(err, decodedToken) {
      logger.debug('AuthJWT - Unauthorized access attempt', err, decodedToken?.aud, decodedToken?.upn);
      resp.status(401).type(`text`).send(`Invalid token`);
    }
  }
}

module.exports = { createAuthJWTMiddleware };
