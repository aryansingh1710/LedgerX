const mongoose = require('mongoose');

/**
 * Account Schema
 * Balance is NEVER stored directly - always computed from ledger entries
 */
const accountSchema = new mongoose.Schema(
  {
    accountNumber: {
      type: String,
      unique: true,
      required: true,
    },
    accountType: {
      type: String,
      enum: ['checking', 'savings', 'business'],
      required: [true, 'Account type is required'],
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Account must belong to a user'],
    },
    currency: {
      type: String,
      default: 'USD',
      uppercase: true,
      maxlength: 3,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    // Metadata
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Index for fast lookups
accountSchema.index({ owner: 1, isActive: 1 });
accountSchema.index({ accountNumber: 1 });

/**
 * Generate unique account number: ACC + 10-digit timestamp-based number
 */
accountSchema.statics.generateAccountNumber = function () {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  return `ACC${timestamp}${random}`;
};

module.exports = mongoose.model('Account', accountSchema);
