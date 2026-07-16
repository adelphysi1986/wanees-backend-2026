const cron = require('node-cron');
const Activity = require('../models/Activity');
const { deleteZoomMeeting } = require('./zoomService');

async function checkExpiredMeetings() {
  console.log('🔍 فحص اجتماعات Zoom المنتهية...');

  const cutoff = new Date(Date.now() - 60 * 60 * 1000);
  try {
    const expiredActivities = await Activity.find({
      status: 'approved',
      sessionTime: { $lt: cutoff },
      zoomMeetingId: { $exists: true, $ne: null },
    });

    for (const activity of expiredActivities) {
      try {
        await deleteZoomMeeting(activity.zoomMeetingId);
        activity.zoomMeetingId = null;
        activity.zoomLink = null;
        await activity.save();
        console.log(`✅ تم حذف اجتماع Zoom للنشاط: ${activity._id}`);
      } catch (err) {
        console.log(`⚠️ فشل حذف اجتماع النشاط ${activity._id}:`, err.message);
      }
    }
  } catch (err) {
    console.log('❌ خطأ بفحص الاجتماعات المنتهية:', err.message);
  }
}

cron.schedule('0 * * * *', checkExpiredMeetings);
module.exports = { checkExpiredMeetings };