const express = require('express');
const router = express.Router();
const { createRating, getTrainerRatings,getAllRatings } = require('../controllers/ratingController');
const verifyUserToken = require('../middleware/userAuthMiddleware'); // 👈 عدّل المسار حسب مكان الملف عندك فعلياً

// إنشاء تقييم جديد (يحتاج تسجيل دخول كزبون)
router.post('/:trainerId/rate', verifyUserToken, createRating);
router.get('/ratings/all', getAllRatings); // 👈 حطه قبل :trainerId

// جلب كل تقييمات مدرب معيّن (عام، ما يحتاج تسجيل دخول)
router.get('/:trainerId/ratings', getTrainerRatings);

module.exports = router;