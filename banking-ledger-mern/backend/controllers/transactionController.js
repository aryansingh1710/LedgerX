const mongoose = require('mongoose');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const LedgerEntry = require('../models/LedgerEntry');
const {
  computeBalance,
  createDepositEntries,
  createWithdrawalEntries,
  createTransferEntries,
  verifyTransactionBalance,
} = require('../utils/ledger');
const { sendSuccess, sendError, getPagination } = require('../utils/response');
const { createAuditLog } = require('../utils/audit');

/**
 * Helper: verify account ownership
 */
const verifyAccountOwnership = async (accountId, userId, role) => {
  const account = await Account.findById(accountId);
  if (!account || !account.isActive) return { error: 'Account not found or inactive.' };
  if (account.owner.toString() !== userId.toString() && role !== 'admin') {
    return { error: 'Not authorized to transact on this account.' };
  }
  return { account };
};

/**
 * @route   POST /api/transactions/deposit/:accountId
 * @desc    Deposit funds into an account
 * @access  Private
 */
const deposit = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { amount, description } = req.body;
    const { accountId } = req.params;

    // Verify ownership
    const { account, error } = await verifyAccountOwnership(accountId, req.user._id, req.user.role);
    if (error) {
      await session.abortTransaction();
      return sendError(res, error, 404);
    }

    // Get current balance
    const currentBalance = await computeBalance(account._id, session);

    // Create transaction record
    const referenceNumber = Transaction.generateReferenceNumber();
    const transaction = await Transaction.create(
      [
        {
          referenceNumber,
          type: 'deposit',
          account: account._id,
          amount: parseFloat(amount),
          description: description || 'Deposit',
          status: 'pending',
          balanceBefore: currentBalance,
          balanceAfter: currentBalance + parseFloat(amount),
          initiatedBy: req.user._id,
          ipAddress: req.ip,
        },
      ],
      { session }
    );

    // Create ledger entries (double-entry)
    const newBalance = await createDepositEntries(
      account._id,
      transaction[0]._id,
      parseFloat(amount),
      currentBalance,
      description || 'Deposit',
      session
    );

    // Update transaction status to completed
    await Transaction.findByIdAndUpdate(
      transaction[0]._id,
      { status: 'completed', balanceAfter: newBalance },
      { session }
    );

    // Verify ledger integrity
    const integrity = await verifyTransactionBalance(transaction[0]._id);
    if (!integrity.valid) {
      await session.abortTransaction();
      return sendError(res, 'Ledger integrity check failed. Transaction aborted.', 500);
    }

    await session.commitTransaction();

    await createAuditLog({
      user: req.user._id,
      action: 'TRANSACTION_DEPOSIT',
      resource: 'Transaction',
      resourceId: transaction[0]._id,
      description: `Deposit $${amount} to account ${account.accountNumber}`,
      ipAddress: req.ip,
    });

    return sendSuccess(
      res,
      {
        transaction: { ...transaction[0].toObject(), status: 'completed' },
        balanceBefore: currentBalance,
        balanceAfter: newBalance,
        referenceNumber,
      },
      `Deposit of $${amount} successful`,
      201
    );
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

/**
 * @route   POST /api/transactions/withdraw/:accountId
 * @desc    Withdraw funds from an account
 * @access  Private
 */
const withdraw = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { amount, description } = req.body;
    const { accountId } = req.params;
    const withdrawAmount = parseFloat(amount);

    const { account, error } = await verifyAccountOwnership(accountId, req.user._id, req.user.role);
    if (error) {
      await session.abortTransaction();
      return sendError(res, error, 404);
    }

    const currentBalance = await computeBalance(account._id, session);

    // Insufficient funds check
    if (currentBalance < withdrawAmount) {
      await session.abortTransaction();

      // Log the failed attempt
      await createAuditLog({
        user: req.user._id,
        action: 'TRANSACTION_FAILED',
        resource: 'Account',
        resourceId: account._id,
        description: `Insufficient funds: attempted $${withdrawAmount}, balance $${currentBalance}`,
        ipAddress: req.ip,
        severity: 'warning',
      });

      return sendError(
        res,
        `Insufficient funds. Available balance: $${currentBalance.toFixed(2)}`,
        400
      );
    }

    const referenceNumber = Transaction.generateReferenceNumber();
    const transaction = await Transaction.create(
      [
        {
          referenceNumber,
          type: 'withdrawal',
          account: account._id,
          amount: withdrawAmount,
          description: description || 'Withdrawal',
          status: 'pending',
          balanceBefore: currentBalance,
          balanceAfter: currentBalance - withdrawAmount,
          initiatedBy: req.user._id,
          ipAddress: req.ip,
        },
      ],
      { session }
    );

    const newBalance = await createWithdrawalEntries(
      account._id,
      transaction[0]._id,
      withdrawAmount,
      currentBalance,
      description || 'Withdrawal',
      session
    );

    await Transaction.findByIdAndUpdate(
      transaction[0]._id,
      { status: 'completed', balanceAfter: newBalance },
      { session }
    );

    const integrity = await verifyTransactionBalance(transaction[0]._id);
    if (!integrity.valid) {
      await session.abortTransaction();
      return sendError(res, 'Ledger integrity check failed. Transaction aborted.', 500);
    }

    await session.commitTransaction();

    await createAuditLog({
      user: req.user._id,
      action: 'TRANSACTION_WITHDRAWAL',
      resource: 'Transaction',
      resourceId: transaction[0]._id,
      description: `Withdrawal $${withdrawAmount} from account ${account.accountNumber}`,
      ipAddress: req.ip,
    });

    return sendSuccess(
      res,
      {
        transaction: { ...transaction[0].toObject(), status: 'completed' },
        balanceBefore: currentBalance,
        balanceAfter: newBalance,
        referenceNumber,
      },
      `Withdrawal of $${withdrawAmount} successful`,
      201
    );
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

/**
 * @route   POST /api/transactions/transfer/:accountId
 * @desc    Transfer funds between accounts
 * @access  Private
 */
const transfer = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { toAccountId, amount, description } = req.body;
    const { accountId } = req.params;
    const transferAmount = parseFloat(amount);

    // Prevent self-transfer
    if (accountId === toAccountId) {
      await session.abortTransaction();
      return sendError(res, 'Cannot transfer to the same account.', 400);
    }

    // Verify source account ownership
    const { account: fromAccount, error: fromError } = await verifyAccountOwnership(
      accountId,
      req.user._id,
      req.user.role
    );
    if (fromError) {
      await session.abortTransaction();
      return sendError(res, fromError, 404);
    }

    // Verify destination account exists (anyone can receive, no ownership check)
    const toAccount = await Account.findById(toAccountId);
    if (!toAccount || !toAccount.isActive) {
      await session.abortTransaction();
      return sendError(res, 'Destination account not found or inactive.', 404);
    }

    const fromBalance = await computeBalance(fromAccount._id, session);
    const toBalance = await computeBalance(toAccount._id, session);

    // Insufficient funds check
    if (fromBalance < transferAmount) {
      await session.abortTransaction();
      return sendError(
        res,
        `Insufficient funds. Available balance: $${fromBalance.toFixed(2)}`,
        400
      );
    }

    const referenceNumber = Transaction.generateReferenceNumber();
    const transaction = await Transaction.create(
      [
        {
          referenceNumber,
          type: 'transfer',
          account: fromAccount._id,
          toAccount: toAccount._id,
          amount: transferAmount,
          description: description || 'Transfer',
          status: 'pending',
          balanceBefore: fromBalance,
          balanceAfter: fromBalance - transferAmount,
          initiatedBy: req.user._id,
          ipAddress: req.ip,
        },
      ],
      { session }
    );

    const { newFromBalance, newToBalance } = await createTransferEntries(
      fromAccount._id,
      toAccount._id,
      transaction[0]._id,
      transferAmount,
      fromBalance,
      toBalance,
      description || 'Transfer',
      session
    );

    await Transaction.findByIdAndUpdate(
      transaction[0]._id,
      { status: 'completed', balanceAfter: newFromBalance },
      { session }
    );

    const integrity = await verifyTransactionBalance(transaction[0]._id);
    if (!integrity.valid) {
      await session.abortTransaction();
      return sendError(res, 'Ledger integrity check failed. Transaction aborted.', 500);
    }

    await session.commitTransaction();

    await createAuditLog({
      user: req.user._id,
      action: 'TRANSACTION_TRANSFER',
      resource: 'Transaction',
      resourceId: transaction[0]._id,
      description: `Transfer $${transferAmount} from ${fromAccount.accountNumber} to ${toAccount.accountNumber}`,
      ipAddress: req.ip,
    });

    return sendSuccess(
      res,
      {
        transaction: { ...transaction[0].toObject(), status: 'completed' },
        from: { accountNumber: fromAccount.accountNumber, balanceBefore: fromBalance, balanceAfter: newFromBalance },
        to: { accountNumber: toAccount.accountNumber, balanceBefore: toBalance, balanceAfter: newToBalance },
        referenceNumber,
      },
      `Transfer of $${transferAmount} successful`,
      201
    );
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

/**
 * @route   GET /api/transactions/:accountId
 * @desc    Get paginated transaction history for an account
 * @access  Private
 */
const getTransactions = async (req, res, next) => {
  try {
    const { accountId } = req.params;
    const {
      page = 1,
      limit = 10,
      type,
      status,
      startDate,
      endDate,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    // Verify account access
    const { account, error } = await verifyAccountOwnership(accountId, req.user._id, req.user.role);
    if (error) return sendError(res, error, 404);

    // Build filter
    const filter = {
      $or: [{ account: account._id }, { toAccount: account._id }],
    };

    if (type) filter.type = type;
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    if (search) {
      filter.$or = [
        { referenceNumber: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .populate('account', 'accountNumber accountType')
        .populate('toAccount', 'accountNumber accountType')
        .populate('initiatedBy', 'firstName lastName')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Transaction.countDocuments(filter),
    ]);

    const pagination = getPagination(page, limit, total);

    return sendSuccess(res, { pagination, transactions });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/transactions/detail/:transactionId
 * @desc    Get a single transaction with its ledger entries
 * @access  Private
 */
const getTransactionDetail = async (req, res, next) => {
  try {
    const transaction = await Transaction.findById(req.params.transactionId)
      .populate('account', 'accountNumber accountType owner')
      .populate('toAccount', 'accountNumber accountType')
      .populate('initiatedBy', 'firstName lastName email');

    if (!transaction) return sendError(res, 'Transaction not found.', 404);

    // Authorization: only account owner or admin
    if (
      transaction.account.owner.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return sendError(res, 'Not authorized to view this transaction.', 403);
    }

    // Fetch associated ledger entries
    const ledgerEntries = await LedgerEntry.find({ transaction: transaction._id })
      .populate('account', 'accountNumber')
      .sort({ sequence: 1 });

    const integrity = await verifyTransactionBalance(transaction._id);

    return sendSuccess(res, { transaction, ledgerEntries, integrity });
  } catch (error) {
    next(error);
  }
};

module.exports = { deposit, withdraw, transfer, getTransactions, getTransactionDetail };
