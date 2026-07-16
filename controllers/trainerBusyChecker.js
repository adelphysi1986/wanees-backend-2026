const cron = require('node-cron');
const Trainer = require('../models/Trainer');
const Activity = require('../models/Activity');

async function checkTrainerBusyStatus() {
  console.log('🔍 is Busy?...');
  try {
    const busyTrainers = await Trainer.find({ isBusy: true });

    for (const trainer of busyTrainers) {
      const lastApproved = await Activity.findOne({
        trainer: trainer._id,
        status: 'approved',
      }).sort({ approvedAt: -1 });

      if (!lastApproved || !lastApproved.approvedAt) continue;

      const oneHourLater = new Date(lastApproved.approvedAt.getTime() + 60 * 60 * 1000);

      if (new Date() >= oneHourLater) {
        trainer.isBusy = false;
        await trainer.save();
        console.log(`المدرب ${trainer.name} رجع متاح تلقائياً`);
      }
    }
  } catch (err) {
    console.error('خطأ بفحص انشغال المدربين:', err.message);
  }
}

cron.schedule('* * * * *', checkTrainerBusyStatus);

module.exports = { checkTrainerBusyStatus };