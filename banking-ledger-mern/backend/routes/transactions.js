const express = require('express');
const router = express.Router();
const {
  deposit,
  withdraw,
  transfer,
  getTransactions,
  getTransactionDetail,
} = require('../controllers/transactionController');
const { protect } = require('../middleware/auth');
const {
  depositValidation,
  withdrawalValidation,
  transferValidation,
  paginationValidation,
} = require('../middleware/validators');

router.use(protect);

// Transaction operations on a specific account
router.post('/deposit/:accountId', depositValidation, deposit);
router.post('/withdraw/:accountId', withdrawalValidation, withdraw);
router.post('/transfer/:accountId', transferValidation, transfer);

// History and details
router.get('/history/:accountId', paginationValidation, getTransactions);
router.get('/detail/:transactionId', getTransactionDetail);

module.exports = router;
