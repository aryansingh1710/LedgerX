const express = require('express');
const router = express.Router();
const {
  getUsers,
  getDashboardStats,
  getAuditLogs,
  toggleUserStatus,
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('admin')); // All admin routes require admin role

router.get('/dashboard', getDashboardStats);
router.get('/users', getUsers);
router.put('/users/:id/toggle-status', toggleUserStatus);
router.get('/audit-logs', getAuditLogs);

module.exports = router;
