const User = require('../models/User');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const AuditLog = require('../models/AuditLog');
const { computeBalance } = require('../utils/ledger');
const { sendSuccess, sendError, getPagination } = require('../utils/response');

/**
 * @route   GET /api/admin/users
 * @desc    Get all users (admin)
 * @access  Admin
 */
const getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, role } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      User.countDocuments(filter),
    ]);

    return sendSuccess(res, { pagination: getPagination(page, limit, total), users });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/admin/dashboard
 * @desc    Get dashboard stats (admin)
 * @access  Admin
 */
const getDashboardStats = async (req, res, next) => {
  try {
    const [totalUsers, totalAccounts, totalTransactions, recentTransactions] = await Promise.all([
      User.countDocuments({ role: 'customer' }),
      Account.countDocuments({ isActive: true }),
      Transaction.countDocuments({ status: 'completed' }),
      Transaction.find({ status: 'completed' })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('account', 'accountNumber')
        .populate('initiatedBy', 'firstName lastName'),
    ]);

    // Total deposits and withdrawals in last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const volumeStats = await Transaction.aggregate([
      {
        $match: {
          status: 'completed',
          createdAt: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    return sendSuccess(res, {
      stats: {
        totalUsers,
        totalAccounts,
        totalTransactions,
        volumeStats,
        recentTransactions,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/admin/audit-logs
 * @desc    Get audit logs with pagination
 * @access  Admin
 */
const getAuditLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, action, severity, userId } = req.query;
    const filter = {};
    if (action) filter.action = action;
    if (severity) filter.severity = severity;
    if (userId) filter.user = userId;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate('user', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      AuditLog.countDocuments(filter),
    ]);

    return sendSuccess(res, { pagination: getPagination(page, limit, total), logs });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/admin/users/:id/toggle-status
 * @desc    Activate or deactivate a user
 * @access  Admin
 */
const toggleUserStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return sendError(res, 'User not found.', 404);
    if (user.role === 'admin') return sendError(res, 'Cannot deactivate admin accounts.', 403);

    user.isActive = !user.isActive;
    await user.save({ validateBeforeSave: false });

    return sendSuccess(res, { user }, `User ${user.isActive ? 'activated' : 'deactivated'} successfully`);
  } catch (error) {
    next(error);
  }
};

module.exports = { getUsers, getDashboardStats, getAuditLogs, toggleUserStatus };
