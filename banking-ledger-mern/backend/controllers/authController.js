const User = require('../models/User');
const { generateToken } = require('../middleware/auth');
const { sendSuccess, sendError } = require('../utils/response');
const { createAuditLog } = require('../utils/audit');

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user (customer role by default)
 * @access  Public
 */
const register = async (req, res, next) => {
  try {
    const { firstName, lastName, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return sendError(res, 'An account with this email already exists.', 409);
    }

    // Only admins can create admin accounts (via separate admin endpoint)
    const userRole = 'customer';

    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      role: userRole,
    });

    const token = generateToken(user._id);

    await createAuditLog({
      user: user._id,
      action: 'USER_REGISTER',
      resource: 'User',
      resourceId: user._id,
      description: `New customer registered: ${email}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    return sendSuccess(
      res,
      {
        token,
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
        },
      },
      'Registration successful',
      201
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/auth/login
 * @desc    Login and receive JWT
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user and include password for comparison
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return sendError(res, 'Invalid email or password.', 401);
    }

    if (!user.isActive) {
      return sendError(res, 'Your account has been deactivated. Contact support.', 401);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return sendError(res, 'Invalid email or password.', 401);
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user._id);

    await createAuditLog({
      user: user._id,
      action: 'USER_LOGIN',
      resource: 'User',
      resourceId: user._id,
      description: `User logged in: ${email}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    return sendSuccess(res, {
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        lastLogin: user.lastLogin,
      },
    }, 'Login successful');
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/auth/me
 * @desc    Get current logged-in user profile
 * @access  Private
 */
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    return sendSuccess(res, { user });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/auth/admin/register
 * @desc    Create an admin account (admin only)
 * @access  Private/Admin
 */
const registerAdmin = async (req, res, next) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return sendError(res, 'An account with this email already exists.', 409);
    }

    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      role: 'admin',
      createdBy: req.user._id,
    });

    const token = generateToken(user._id);

    await createAuditLog({
      user: req.user._id,
      action: 'ADMIN_ACTION',
      resource: 'User',
      resourceId: user._id,
      description: `Admin account created for: ${email} by ${req.user.email}`,
      ipAddress: req.ip,
      severity: 'warning',
    });

    return sendSuccess(
      res,
      {
        token,
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
        },
      },
      'Admin account created successfully',
      201
    );
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, getMe, registerAdmin };
