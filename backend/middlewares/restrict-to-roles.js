const { logger } = require("../logging/log");

const restrictToRoles = (...roles) => {
  return (req, res, next) => {
    const userRoles = req.roles;
    console.log(userRoles);
    console.log(roles);

    // if user has one of the specified roles
    if (userRoles.some((r) => roles.includes(r))) {
      next();
    } else {
      logger.debug(
        `RoleRestriction s - Unauthorized access attempt ${req.method} ${req.url} by user ${req.authenticatedUser}`
      );
      res.status(403).type("text/plain").send("Operation not allowed");
    }
  };
};

module.exports = { restrictToRoles };
