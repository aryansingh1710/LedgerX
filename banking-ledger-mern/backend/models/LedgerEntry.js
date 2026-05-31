const mongoose = require('mongoose');

/**
 * LedgerEntry Schema - Core of Double-Entry Accounting
 *
 * Every financial event creates TWO entries:
 *   - One DEBIT entry (money going out of an account or increasing an asset)
 *   - One CREDIT entry (money coming into an account or decreasing an asset)
 *
 * RULE: Sum of all DEBIT amounts === Sum of all CREDIT amounts for any transaction
 */
const ledgerEntrySchema = new mongoose.Schema(
  {
    // The transaction this entry belongs to
    transaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
      required: [true, 'Ledger entry must belong to a transaction'],
      index: true,
    },

    // The account being debited or credited
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: [true, 'Ledger entry must reference an account'],
      index: true,
    },

    // Entry type
    entryType: {
      type: String,
      enum: ['debit', 'credit'],
      required: [true, 'Entry type (debit/credit) is required'],
    },

    // Positive amount - direction determined by entryType
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than 0'],
    },

    // Running balance of the account AFTER this entry
    // Stored for performance (avoids full recompute on every query)
    runningBalance: {
      type: Number,
      required: true,
    },

    // Human-readable description
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    currency: {
      type: String,
      default: 'USD',
      uppercase: true,
    },

    // Sequence within transaction (1 = first entry, 2 = second, etc.)
    sequence: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient balance calculations
ledgerEntrySchema.index({ account: 1, createdAt: 1 });
ledgerEntrySchema.index({ transaction: 1, sequence: 1 });

module.exports = mongoose.model('LedgerEntry', ledgerEntrySchema);
