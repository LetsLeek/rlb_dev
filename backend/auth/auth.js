const ROLE_WORKER = 'worker';
const ROLE_SUPER_WORKER = 'superworker';
const ROLE_ADMIN = 'admin';

function hasRole(req, ...roles) {
  if (!Array.isArray(req.roles)) return false;

  console.log(req.roles, roles);
  for (let role of roles) {
    if (req.roles.includes(role)) {
      return true;
    }
  }
  return false;
}

module.exports = {
  ROLE_WORKER,
  ROLE_SUPER_WORKER,
  ROLE_ADMIN,
  hasRole
};
