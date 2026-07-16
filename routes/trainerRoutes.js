const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/authMiddleware');

const {
  registerTrainer,
  loginTrainer,
  getProfile,
  updateProfile,
  getAllTrainers,
  getTrainerReport
} = require('../controllers/trainerController');


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