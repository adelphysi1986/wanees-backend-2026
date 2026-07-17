const express = require('express');
const router = express.Router();
const { protectAdmin, requireRole } = require('../middleware/adminAuthMiddleware');
const {
  registerAdmin,
  loginAdmin,
  getAdminProfile,
  changeAdminPassword,
  listTrainersForAdmin,
  getTrainerForAdmin,
  updateTrainerForAdmin,
  getAdminStats,
  listAdminsForAdmin,
  updateAdminForAdmin,
  listUsersForAdmin,
  getUserForAdmin,
  updateUserForAdmin,
  listActivitiesForAdmin,        // ⬅️ جديد
  updateActivityStatusForAdmin,  // ⬅️ جديد
  deleteActivityForAdmin,  getReportByEntity,
  markActivityAsPaid  ,
  getAdminReportByTrainerCode    // ⬅️ جديد
} = require('../controllers/adminController');

router.post('/register', registerAdmin);
router.post('/login', loginAdmin);

router.get('/profile', protectAdmin, getAdminProfile);
router.put('/change-password', protectAdmin, changeAdminPassword);

router.get('/trainers', protectAdmin, listTrainersForAdmin);
router.get('/trainers/:id', protectAdmin, getTrainerForAdmin);
router.put('/trainers/:id', protectAdmin, requireRole('full', 'editor'), updateTrainerForAdmin);

router.get('/stats', protectAdmin, getAdminStats);
router.get('/admins', protectAdmin, requireRole('full'), listAdminsForAdmin);
router.put('/admins/:id', protectAdmin, requireRole('full'), updateAdminForAdmin);
router.get('/users', protectAdmin, listUsersForAdmin);
router.get('/users/:id', protectAdmin, getUserForAdmin);
router.put('/users/:id', protectAdmin, updateUserForAdmin);
router.put('/activities/:id/mark-paid', protectAdmin, markActivityAsPaid);// ── الطلبات (النشاطات/الحجوزات) ──
router.get('/report', protectAdmin, getReportByEntity);
router.get('/activities', protectAdmin, listActivitiesForAdmin);
router.put('/activities/:id/status', protectAdmin, requireRole('full', 'editor'), updateActivityStatusForAdmin);
router.delete('/activities/:id', protectAdmin, requireRole('full', 'editor'), deleteActivityForAdmin);
router.get('/report-by-code', protectAdmin, getAdminReportByTrainerCode);
module.exports = router;