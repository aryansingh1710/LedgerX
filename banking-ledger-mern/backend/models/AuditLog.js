const mongoose = require('mongoose');

/**
 * AuditLog Schema
 * Records all significant actions for security and compliance
 */
const auditLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        'USER_REGISTER',
        'USER_LOGIN',
        'USER_LOGOUT',
        'ACCOUNT_CREATED',
        'ACCOUNT_UPDATED',
        'ACCOUNT_DEACTIVATED',
        'TRANSACTION_DEPOSIT',
        'TRANSACTION_WITHDRAWAL',
        'TRANSACTION_TRANSFER',
        'TRANSACTION_FAILED',
        'PASSWORD_CHANGED',
        'ADMIN_ACTION',
      ],
    },
    resource: {
      type: String, // e.g., 'Account', 'Transaction'
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    description: {
      type: String,
      maxlength: 500,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    // Before/after snapshot for data changes
    changes: {
      type: mongoose.Schema.Types.Mixed,
    },
    severity: {
      type: String,
      enum: ['info', 'warning', 'critical'],
      default: 'info',
    },
  },
  {
    timestamps: true,
  }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ action: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
