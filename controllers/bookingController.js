const { 
  createBookingActivity,
  getTrainerActivities
} = require('./activityService');
const Activity = require('../models/Activity');
const { emitActivityChange } = require('../socket'); // ⬅️ جديد
const { createZoomMeeting } = require('../controllers/zoomService'); // عدّ
const { deleteZoomMeeting } = require('../controllers/zoomService');

const { sendPushToToken, sendPushToMultipleTokens } = require('../pushNotificationService'); // ⚠️ عدّل المسار حسب مكانه عندك
const User = require('../models/User'); // ⚠️ عدّل حسب اسم موديل المستخدم عندك
const Trainer = require("../models/Trainer"); // عدّل المسار حسب مشروعك
const Admin = require("../models/Admin");

exports.createBooking = async (req, res) => {
  console.log("========== BOOKING CONTROLLER FILE START ==========");

  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // تحقق: هل عند الزبون طلب اتعمل خلال آخر ساعة؟
const recentActivity = await Activity.findOne({
  customer: req.userId,
  createdAt: { $gt: oneHourAgo },
  status: { $nin: ['rejected', 'cancelled'] },
});

    if (recentActivity) {
      return res.status(400).json({
        success: false,
        message: 'لقد قمت بطلب مسبقاً، الرجاء الانتظار ساعة قبل إرسال طلب جديد',
      });
    }

    const activity = await createBookingActivity({
      customerId: req.userId,
      customerName: req.body.customerName,

      trainerId: req.body.trainerId,
      trainerName: req.body.trainerName,

      description: req.body.description,

      sessionTime: req.body.sessionTime,
    });

    // ⬅️ بث فوري للزبون (بحال عندو أكتر من جهاز مفتوح)
    emitActivityChange(activity.customer.toString(), {
      type: 'created',
      activityId: activity._id.toString(),
    });

    // ⬅️ جديد — إشعارات Push للمدرب وللأدمن
    sendBookingCreatedNotifications(activity, req.body).catch((err) =>
      console.log('❌ خطأ بإرسال إشعارات الحجز:', err.message)
    );

    res.status(201).json({
      success: true,
      activity,
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: error.message,
    });
  }
};

/**
 * دالة منفصلة لإرسال الإشعارات - ما بتوقف الـ response لو صار خطأ فيها
 */


async function sendBookingCreatedNotifications(activity, bodyData) {
  try {
    console.log("========== SEND BOOKING NOTIFICATIONS ==========");

    const sessionDate = new Date(bodyData.sessionTime);

    const formattedDate = sessionDate.toLocaleString("ar-EG", {
      dateStyle: "medium",
      timeStyle: "short",
    });

    const notificationTitle = "طلب حجز جديد";

    const notificationBody =
      `${bodyData.customerName} حجز جلسة بتاريخ ${formattedDate}`;

    const notificationData = {
      type: "booking_created",
      activityId: activity._id.toString(),
      trainerId: String(bodyData.trainerId),
    };


    // ── إشعار المدرب ──
    console.log("🔍 البحث عن المدرب...");

    const trainer = await Trainer.findById(bodyData.trainerId)
      .select("fcmToken");

    console.log("Trainer =", trainer);

    if (trainer?.fcmToken) {

      console.log("📲 إرسال إشعار للمدرب...");

      const trainerResult = await sendPushToToken(
        trainer.fcmToken,
        notificationTitle,
        notificationBody,
        notificationData
      );

      console.log("✅ نتيجة إرسال المدرب:", trainerResult);

    } else {
      console.log("❌ المدرب لا يملك FCM Token");
    }


    // ── إشعارات الأدمن ──
    console.log("🔍 البحث عن الأدمن...");

    const adminsList = await Admin.find({})
      .select("fcmToken");

    console.log("عدد الأدمن:", adminsList.length);


    const tokensList = adminsList
      .map((admin) => admin.fcmToken)
      .filter(Boolean);


    console.log("Admin Tokens:", tokensList);


    if (tokensList.length > 0) {

      console.log("📲 إرسال إشعارات الأدمن...");

      const adminResult = await sendPushToMultipleTokens(
        tokensList,
        notificationTitle,
        notificationBody,
        notificationData
      );

      console.log("✅ نتيجة إشعارات الأدمن:", adminResult);

    } else {

      console.log("⚠️ لا يوجد Admin Tokens");

    }


    console.log("========== END NOTIFICATIONS ==========");

  } catch (err) {

    console.error("❌ sendBookingCreatedNotifications ERROR");
    console.error(err);

  }
}

exports.updateBookingStatusByTrainer = async (req, res) => {
  try {

    console.log("=== UPDATE STATUS TRAINER ===");
    console.log("ID:", req.params.id);
    console.log("BODY:", req.body);
    console.log("TRAINER ID:", req.trainerId);

    const now = new Date(); // ⬅️ الإضافة المطلوبة

    const { status } = req.body;


    const activity = await Activity.findById(req.params.id);

    console.log("ACTIVITY:", activity);


    if (!activity) {
      return res.status(404).json({
        message: 'النشاط غير موجود'
      });
    }


    if (activity.trainer.toString() !== req.trainerId.toString()) {
      return res.status(403).json({
        message: 'ليس لديك صلاحية'
      });
    }


    activity.status = status;
    activity.actionBy = 'trainer';


   // controllers/activityController.js (الجزء الخاص بالموافقة)
if (status === 'approved') {
  activity.approvedAt = now;

  const meeting = await createZoomMeeting({
    topic: `جلسة مع ${activity.customerName}`,
    startTime: activity.sessionTime,
    duration: 60,
  });

  activity.zoomLink = meeting.join_url;
  activity.zoomMeetingId = meeting.id;

  await Trainer.findByIdAndUpdate(activity.trainer, { isBusy: true });
}

    if (status === 'cancelled' || status === 'rejected') {
      if (activity.zoomMeetingId) {
        await deleteZoomMeeting(activity.zoomMeetingId);
        activity.zoomMeetingId = null;
        activity.zoomLink = null;
      }
    }

    if (status === 'rejected') {
      activity.rejectedAt = new Date();
    }


  await activity.save();

// ⬅️ جديد — إعلام الزبون فوراً بتغيير الحالة من المدرب
emitActivityChange(activity.customer.toString(), {
  type: 'updated',
  activityId: activity._id.toString(),
});

// ⬅️ جديد — إشعار الأدمن بتغيير الحالة من المدرب
// ⬅️ جديد — إشعار الأدمن بتغيير الحالة من المدرب
try {
  const statusText = {
    approved: 'وافق على',
    rejected: 'رفض',
    cancelled: 'ألغى',
  };

  const actionText = statusText[status] || 'غيّر حالة';

  // جلب اسم المدرب
  const trainerDoc = await Trainer.findById(activity.trainer).select('name');
  const trainerName = trainerDoc?.name || 'المدرب';

  const notificationTitle = 'تحديث حالة الطلب';
  const notificationBody = `${trainerName} ${actionText} طلب حجز الزبون ${activity.customerName}`;

  const notificationData = {
    type: 'booking_status_updated',
    activityId: activity._id.toString(),
    status: status,
    trainerId: activity.trainer.toString(),
  };

  const adminsList = await Admin.find({}).select('fcmToken');
  const tokensList = adminsList.map((admin) => admin.fcmToken).filter(Boolean);

  if (tokensList.length > 0) {
    await sendPushToMultipleTokens(
      tokensList,
      notificationTitle,
      notificationBody,
      notificationData
    );
    console.log('✅ تم إرسال إشعار الأدمن بتغيير الحالة');
  } else {
    console.log('⚠️ لا يوجد Admin Tokens');
  }
} catch (notifError) {
  console.error('❌ خطأ إرسال إشعار الأدمن:', notifError);
}
res.json({
  success: true,
  activity
});


  } catch (error) {

    console.log("UPDATE STATUS ERROR:");
    console.log(error);

    res.status(500).json({
      message: error.message
    });

  }
};

// جلسات المدرب
exports.getTrainerActivities = async (req, res) => {
  try {

    const activities = await getTrainerActivities(req.trainerId);

    res.status(200).json({
      success: true,
      activities
    });

  } catch (error) {

    console.log(error);

    res.status(500).json({
      message: error.message
    });

  }
};