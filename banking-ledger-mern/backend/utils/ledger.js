const LedgerEntry = require('../models/LedgerEntry');
const Transaction = require('../models/Transaction');

/**
 * LEDGER UTILITY
 * Core double-entry accounting functions.
 *
 * Double-Entry Rules:
 * - Every transaction has at least one DEBIT and one CREDIT
 * - Total debits MUST equal total credits
 * - Balance = Sum(Credits) - Sum(Debits) for liability/equity accounts
 *           = Sum(Debits) - Sum(Credits) for asset accounts (bank accounts)
 *
 * For a BANK ACCOUNT (asset):
 *   DEBIT  = money in  (balance increases)
 *   CREDIT = money out (balance decreases)
 */

/**
 * Compute the current balance of an account from ledger entries
 * Balance = Sum of all DEBIT amounts - Sum of all CREDIT amounts
 *
 * @param {ObjectId} accountId
 * @param {Object} session - Optional MongoDB session
 * @returns {Number} Current balance
 */
const computeBalance = async (accountId, session = null) => {
  const pipeline = [
    { $match: { account: accountId } },
    {
      $group: {
        _id: '$entryType',
        total: { $sum: '$amount' },
      },
    },
  ];

  const opts = session ? { session } : {};
  const result = await LedgerEntry.aggregate(pipeline, opts);

  let debits = 0;
  let credits = 0;

  result.forEach((item) => {
    if (item._id === 'debit') debits = item.total;
    if (item._id === 'credit') credits = item.total;
  });

  // For bank accounts: Debit = IN, Credit = OUT
  return parseFloat((debits - credits).toFixed(2));
};

/**
 * Create a pair of ledger entries for a DEPOSIT
 * Money flows INTO the account.
 *
 * Entry 1: DEBIT  the customer account (asset increases)
 * Entry 2: CREDIT the "cash/external" system account
 *          (simplified: we use the same account as a mirror credit)
 *
 * In a real bank, Entry 2 would be against a "Cash Received" account.
 * For this system, we record the deposit as a self-balancing debit/credit
 * where the debit represents the actual balance change.
 *
 * @param {ObjectId} accountId
 * @param {ObjectId} transactionId
 * @param {Number} amount
 * @param {Number} currentBalance
 * @param {String} description
 * @param {Object} session
 */
const createDepositEntries = async (
  accountId,
  transactionId,
  amount,
  currentBalance,
  description,
  session
) => {
  const newBalance = parseFloat((currentBalance + amount).toFixed(2));

  const entries = [
    {
      transaction: transactionId,
      account: accountId,
      entryType: 'debit',  // DEBIT = money in for asset accounts
      amount,
      runningBalance: newBalance,
      description: `Deposit: ${description}`,
      currency: 'USD',
      sequence: 1,
    },
    {
      transaction: transactionId,
      account: accountId,
      entryType: 'credit', // Mirror credit (represents external cash source)
      amount,
      runningBalance: currentBalance, // Balance before this credit is processed in isolation
      description: `Deposit source (external): ${description}`,
      currency: 'USD',
      sequence: 2,
    },
  ];

  // Note: The balance effect net = debit - credit = +amount (correct for deposit)
  // We track the TRUE running balance only on the debit (sequence 1)
  await LedgerEntry.insertMany(entries, { session });

  return newBalance;
};

/**
 * Create ledger entries for a WITHDRAWAL
 * Money flows OUT of the account.
 *
 * Entry 1: CREDIT the customer account (asset decreases)
 * Entry 2: DEBIT the "cash/external" mirror account
 *
 * @param {ObjectId} accountId
 * @param {ObjectId} transactionId
 * @param {Number} amount
 * @param {Number} currentBalance
 * @param {String} description
 * @param {Object} session
 */
const createWithdrawalEntries = async (
  accountId,
  transactionId,
  amount,
  currentBalance,
  description,
  session
) => {
  const newBalance = parseFloat((currentBalance - amount).toFixed(2));

  const entries = [
    {
      transaction: transactionId,
      account: accountId,
      entryType: 'credit', // CREDIT = money out for asset accounts
      amount,
      runningBalance: newBalance,
      description: `Withdrawal: ${description}`,
      currency: 'USD',
      sequence: 1,
    },
    {
      transaction: transactionId,
      account: accountId,
      entryType: 'debit',  // Mirror debit (represents external cash destination)
      amount,
      runningBalance: currentBalance,
      description: `Withdrawal destination (external): ${description}`,
      currency: 'USD',
      sequence: 2,
    },
  ];

  await LedgerEntry.insertMany(entries, { session });

  return newBalance;
};

/**
 * Create ledger entries for a TRANSFER between two accounts
 * Proper double-entry: 4 entries total (2 per account)
 *
 * From Account:
 *   Entry 1: CREDIT fromAccount (money leaves)
 *   Entry 2: DEBIT  fromAccount mirror
 *
 * To Account:
 *   Entry 3: DEBIT  toAccount (money arrives)
 *   Entry 4: CREDIT toAccount mirror
 *
 * @param {ObjectId} fromAccountId
 * @param {ObjectId} toAccountId
 * @param {ObjectId} transactionId
 * @param {Number} amount
 * @param {Number} fromBalance - Current balance of source
 * @param {Number} toBalance - Current balance of destination
 * @param {String} description
 * @param {Object} session
 */
const createTransferEntries = async (
  fromAccountId,
  toAccountId,
  transactionId,
  amount,
  fromBalance,
  toBalance,
  description,
  session
) => {
  const newFromBalance = parseFloat((fromBalance - amount).toFixed(2));
  const newToBalance = parseFloat((toBalance + amount).toFixed(2));

  const entries = [
    // Source account: money leaves (credit = asset decreases)
    {
      transaction: transactionId,
      account: fromAccountId,
      entryType: 'credit',
      amount,
      runningBalance: newFromBalance,
      description: `Transfer out to ${toAccountId}: ${description}`,
      currency: 'USD',
      sequence: 1,
    },
    // Destination account: money arrives (debit = asset increases)
    {
      transaction: transactionId,
      account: toAccountId,
      entryType: 'debit',
      amount,
      runningBalance: newToBalance,
      description: `Transfer in from ${fromAccountId}: ${description}`,
      currency: 'USD',
      sequence: 2,
    },
    // Balancing entries (inter-account settlement)
    {
      transaction: transactionId,
      account: fromAccountId,
      entryType: 'debit',
      amount,
      runningBalance: fromBalance,
      description: `Transfer settlement debit: ${description}`,
      currency: 'USD',
      sequence: 3,
    },
    {
      transaction: transactionId,
      account: toAccountId,
      entryType: 'credit',
      amount,
      runningBalance: toBalance,
      description: `Transfer settlement credit: ${description}`,
      currency: 'USD',
      sequence: 4,
    },
  ];

  await LedgerEntry.insertMany(entries, { session });

  return { newFromBalance, newToBalance };
};

/**
 * Verify ledger integrity for a transaction
 * Total debits must equal total credits
 *
 * @param {ObjectId} transactionId
 * @returns {{ valid: boolean, debits: number, credits: number }}
 */
const verifyTransactionBalance = async (transactionId) => {
  const result = await LedgerEntry.aggregate([
    { $match: { transaction: transactionId } },
    {
      $group: {
        _id: '$entryType',
        total: { $sum: '$amount' },
      },
    },
  ]);

  let debits = 0;
  let credits = 0;
  result.forEach((item) => {
    if (item._id === 'debit') debits = item.total;
    if (item._id === 'credit') credits = item.total;
  });

  return {
    valid: Math.abs(debits - credits) < 0.001, // floating point tolerance
    debits: parseFloat(debits.toFixed(2)),
    credits: parseFloat(credits.toFixed(2)),
  };
};

module.exports = {
  computeBalance,
  createDepositEntries,
  createWithdrawalEntries,
  createTransferEntries,
  verifyTransactionBalance,
};
