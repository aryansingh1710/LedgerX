const express = require('express');
const router = express.Router();
const {
  createAccount,
  getAccounts,
  getAccount,
  updateAccount,
  deactivateAccount,
} = require('../controllers/accountController');
const { protect, authorize } = require('../middleware/auth');
const { createAccountValidation } = require('../middleware/validators');

router.use(protect); // All account routes require auth

router.route('/')
  .get(getAccounts)
  .post(createAccountValidation, createAccount);

router.route('/:id')
  .get(getAccount)
  .put(updateAccount)
  .delete(authorize('admin'), deactivateAccount);

module.exports = router;
