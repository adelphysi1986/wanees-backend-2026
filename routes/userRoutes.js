const express = require('express');
const router = express.Router();
const {
  register,
  login,
  googleAuth,
  getMe,getMyProfile, updateMyCode,
    toggleFavoriteTrainer, getMyFavoriteTrainers, getUserConfirmedBookings// 👈 جديد

} = require('../controllers/userAuthController');

const verifyUserToken = require('../middleware/userAuthMiddleware');
  console.log("LOGIN ROUTE HIT");
router.post('/favorites/:trainerId', verifyUserToken, toggleFavoriteTrainer);
router.get('/favorites', verifyUserToken, getMyFavoriteTrainers);
router.get('/getorders', verifyUserToken, getUserConfirmedBookings);
router.get('/profile/me', verifyUserToken, getMyProfile);
router.put('/profile/code', verifyUserToken, updateMyCode);
router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);
router.get('/me', verifyUserToken, getMe);

module.exports = router;