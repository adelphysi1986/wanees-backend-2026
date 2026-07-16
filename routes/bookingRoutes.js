const express = require('express');
const router = express.Router();
const controller = require('../controllers/bookingController');
const { protect } = require('../middleware/authMiddleware');

const { createBooking } = controller;
const verifyUserToken = require('../middleware/userAuthMiddleware');
router.get(
 '/trainer',
 protect,
 controller.getTrainerActivities
);
router.post('/', verifyUserToken, (req, res, next) => {
  next();
}, (req,res)=>{
  createBooking(req,res);
});
router.put(
  '/trainer/:id/status',
  protect,
  controller.updateBookingStatusByTrainer
);
module.exports = router;