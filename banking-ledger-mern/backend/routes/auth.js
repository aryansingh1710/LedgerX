const express = require('express');
const router = express.Router();
const { register, login, getMe, registerAdmin } = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');
const { registerValidation, loginValidation } = require('../middleware/validators');

router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.get('/me', protect, getMe);
router.post('/admin/register', protect, authorize('admin'), registerValidation, registerAdmin);

module.exports = router;
