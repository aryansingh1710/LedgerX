const mongoose = require('mongoose');

/**
 * Transaction Schema
 * Represents a financial event (deposit, withdrawal, transfer)
 * Actual money movement is recorded in LedgerEntry documents
 */
const transactionSchema = new mongoose.Schema(
  {
    // Unique reference number for the transaction
    referenceNumber: {
      type: String,
      unique: true,
      required: true,
    },

    type: {
      type: String,
      enum: ['deposit', 'withdrawal', 'transfer'],
      required: [true, 'Transaction type is required'],
    },

    // Primary account involved (source for transfer/withdrawal, destination for deposit)
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: [true, 'Primary account is required'],
      index: true,
    },

    // For transfers: the destination account
    toAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      default: null,
    },

    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than 0'],
    },

    currency: {
      type: String,
      default: 'USD',
      uppercase: true,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'reversed'],
      default: 'pending',
    },

    // Snapshots for audit purposes
    balanceBefore: {
      type: Number,
      required: true,
    },
    balanceAfter: {
      type: Number,
      required: true,
    },

    // Who initiated the transaction
    initiatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Failure reason if status = 'failed'
    failureReason: {
      type: String,
    },

    // IP address for audit trail
    ipAddress: {
      type: String,
    },

    // Metadata / tags for filtering
    metadata: {
      type: Map,
      of: String,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for pagination and filtering
transactionSchema.index({ account: 1, createdAt: -1 });
transactionSchema.index({ toAccount: 1, createdAt: -1 });
transactionSchema.index({ referenceNumber: 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ type: 1 });

// Virtual: ledger entries for this transaction
transactionSchema.virtual('ledgerEntries', {
  ref: 'LedgerEntry',
  localField: '_id',
  foreignField: 'transaction',
});

/**
 * Generate unique reference number: TXN + YYYYMMDD + 8-char random hex
 */
transactionSchema.statics.generateReferenceNumber = function () {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(16).slice(2, 10).toUpperCase();
  return `TXN${date}${random}`;
};

module.exports = mongoose.model('Transaction', transactionSchema);
