const Activity = require('../models/Activity');

async function createBookingActivity({
  customerId,
  customerName,
  trainerId,
  trainerName,
  sessionTime,
  zoomLink,
  description,
}) {
  return Activity.create({
    customer: customerId,
    customerName,
    trainer: trainerId,
    trainerName,
    sessionTime,
    description,
    zoomLink: zoomLink || Activity.DEFAULT_ZOOM_LINK,
    status: 'pending',
  });
}


// جلب جلسات المدرب
async function getTrainerActivities(trainerId) {
  return Activity.find({
    trainer: trainerId,
  }).sort({
    sessionTime: 1,
  });
}

module.exports = {
  createBookingActivity,
  getTrainerActivities,
};