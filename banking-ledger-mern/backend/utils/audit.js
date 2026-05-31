const AuditLog = require('../models/AuditLog');

/**
 * Create an audit log entry
 * Non-blocking - errors are logged but don't fail the request
 */
const createAuditLog = async ({
  user,
  action,
  resource,
  resourceId,
  description,
  ipAddress,
  userAgent,
  changes,
  severity = 'info',
}) => {
  try {
    await AuditLog.create({
      user,
      action,
      resource,
      resourceId,
      description,
      ipAddress,
      userAgent,
      changes,
      severity,
    });
  } catch (err) {
    // Audit log failure should never break the main flow
    console.error('Audit log error:', err.message);
  }
};

module.exports = { createAuditLog };
