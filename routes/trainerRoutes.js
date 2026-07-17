const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/authMiddleware');

const {
  registerTrainer,
  loginTrainer,
  getProfile,
  updateProfile,
  getAllTrainers,
  getTrainerReport,getReportByTrainerCode
} = require('../controllers/trainerController');

router.get('/report-by-code', protect, getReportByTrainerCode);
router.post('/register', registerTrainer);
router.post('/login', loginTrainer);

router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);

router.get("/", getAllTrainers);

router.get(
  '/report',
  protect,
  getTrainerReport
);

module.exports = router;