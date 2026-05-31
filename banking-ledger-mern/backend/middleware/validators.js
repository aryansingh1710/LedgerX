const { body, param, query, validationResult } = require('express-validator');
const { sendError } = require('../utils/response');

/**
 * Check validation results and return errors if any
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendError(
      res,
      'Validation failed',
      400,
      errors.array().map((e) => ({ field: e.path, message: e.msg }))
    );
  }
  next();
};

// Auth validators
const registerValidation = [
  body('firstName').trim().notEmpty().withMessage('First name is required').isLength({ max: 50 }),
  body('lastName').trim().notEmpty().withMessage('Last name is required').isLength({ max: 50 }),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase, lowercase, and number'),
  validate,
];

const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  validate,
];

// Account validators
const createAccountValidation = [
  body('accountType')
    .isIn(['checking', 'savings', 'business'])
    .withMessage('Account type must be checking, savings, or business'),
  body('currency').optional().isLength({ min: 3, max: 3 }).withMessage('Currency must be 3 chars'),
  body('description').optional().isLength({ max: 200 }),
  validate,
];

// Transaction validators
const depositValidation = [
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number greater than 0'),
  body('description').optional().isLength({ max: 500 }),
  validate,
];

const withdrawalValidation = [
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number greater than 0'),
  body('description').optional().isLength({ max: 500 }),
  validate,
];

const transferValidation = [
  body('toAccountId').notEmpty().withMessage('Destination account ID is required').isMongoId(),
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number greater than 0'),
  body('description').optional().isLength({ max: 500 }),
  validate,
];

// Pagination validators
const paginationValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  validate,
];

module.exports = {
  registerValidation,
  loginValidation,
  createAccountValidation,
  depositValidation,
  withdrawalValidation,
  transferValidation,
  paginationValidation,
};
