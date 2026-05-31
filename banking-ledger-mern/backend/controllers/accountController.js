const Account = require('../models/Account');
const { computeBalance } = require('../utils/ledger');
const { sendSuccess, sendError, getPagination } = require('../utils/response');
const { createAuditLog } = require('../utils/audit');

/**
 * @route   POST /api/accounts
 * @desc    Create a new bank account
 * @access  Private
 */
const createAccount = async (req, res, next) => {
  try {
    const { accountType, currency, description } = req.body;

    const accountNumber = Account.generateAccountNumber();

    const account = await Account.create({
      accountNumber,
      accountType,
      currency: currency || 'USD',
      description,
      owner: req.user._id,
      createdBy: req.user._id,
    });

    await createAuditLog({
      user: req.user._id,
      action: 'ACCOUNT_CREATED',
      resource: 'Account',
      resourceId: account._id,
      description: `Account created: ${accountNumber} (${accountType})`,
      ipAddress: req.ip,
    });

    return sendSuccess(
      res,
      { account: { ...account.toObject(), balance: 0 } },
      'Account created successfully',
      201
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/accounts
 * @desc    Get all accounts for the current user (admin sees all)
 * @access  Private
 */
const getAccounts = async (req, res, next) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { owner: req.user._id };
    filter.isActive = true;

    const accounts = await Account.find(filter)
      .populate('owner', 'firstName lastName email')
      .sort({ createdAt: -1 });

    // Compute balance for each account
    const accountsWithBalance = await Promise.all(
      accounts.map(async (account) => {
        const balance = await computeBalance(account._id);
        return { ...account.toObject(), balance };
      })
    );

    return sendSuccess(res, {
      count: accountsWithBalance.length,
      accounts: accountsWithBalance,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/accounts/:id
 * @desc    Get single account with balance
 * @access  Private
 */
const getAccount = async (req, res, next) => {
  try {
    const account = await Account.findById(req.params.id).populate(
      'owner',
      'firstName lastName email'
    );

    if (!account) {
      return sendError(res, 'Account not found.', 404);
    }

    // Authorization: owner or admin
    if (account.owner._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return sendError(res, 'Not authorized to view this account.', 403);
    }

    const balance = await computeBalance(account._id);

    return sendSuccess(res, { account: { ...account.toObject(), balance } });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/accounts/:id
 * @desc    Update account description
 * @access  Private
 */
const updateAccount = async (req, res, next) => {
  try {
    const { description } = req.body;

    const account = await Account.findById(req.params.id);
    if (!account) return sendError(res, 'Account not found.', 404);

    if (account.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return sendError(res, 'Not authorized to update this account.', 403);
    }

    account.description = description || account.description;
    await account.save();

    return sendSuccess(res, { account }, 'Account updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/accounts/:id
 * @desc    Deactivate an account (admin only)
 * @access  Private/Admin
 */
const deactivateAccount = async (req, res, next) => {
  try {
    const account = await Account.findById(req.params.id);
    if (!account) return sendError(res, 'Account not found.', 404);

    // Check balance before deactivating
    const balance = await computeBalance(account._id);
    if (balance !== 0) {
      return sendError(res, `Cannot deactivate account with non-zero balance ($${balance}).`, 400);
    }

    account.isActive = false;
    await account.save();

    await createAuditLog({
      user: req.user._id,
      action: 'ACCOUNT_DEACTIVATED',
      resource: 'Account',
      resourceId: account._id,
      description: `Account deactivated: ${account.accountNumber}`,
      ipAddress: req.ip,
      severity: 'warning',
    });

    return sendSuccess(res, {}, 'Account deactivated successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = { createAccount, getAccounts, getAccount, updateAccount, deactivateAccount };
