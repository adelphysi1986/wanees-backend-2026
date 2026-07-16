const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Trainer = require('../models/Trainer');
const User = require('../models/User');
const { emitActivityChange } = require('../socket'); // ⬅️ جديد
const Activity = require('../models/Activity'); // ⬅️ جديد — لإدارة الطلبات
const { createZoomMeeting } = require('../controllers/zoomService'); // عدّل المسار حسب مكان الملف عندك
const { deleteZoomMeeting } = require('../controllers/zoomService');
const { sendPushToToken } = require("../pushNotificationService");
 // عدّل المسار حسب مكان الملف
const generateToken = (adminId) => {
  return jwt.sign({ id: adminId }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};
exports.markActivityAsPaid = async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id);

    if (!activity) {
      return res.status(404).json({ message: 'النشاط غير موجود' });
    }

    if (activity.isPaid) {
      return res.status(400).json({ message: 'تم الدفع لهذا النشاط مسبقاً' });
    }

    const trainer = await Trainer.findById(activity.trainer).select('price');

    if (!trainer) {
      return res.status(404).json({ message: 'المدرب غير موجود' });
    }

    activity.isPaid = true;
    activity.paidAmount = trainer.price;
    activity.paidAt = new Date();

    await activity.save();

    // زيادة رصيد المدرب وعدد الدفعات تلقائياً
    await Trainer.findByIdAndUpdate(activity.trainer, {
      $inc: {
        balance: trainer.price,
        paymentsCount: 1,
      },
    });

    res.status(200).json({
      success: true,
      message: 'تم تسجيل الدفع بنجاح',
      activity,
    });
  } catch (error) {
    console.error('❌ خطأ بتسجيل الدفع:', error);
    res.status(500).json({ message: error.message });
  }
};
// POST /api/admin/register — بدون اختيار صلاحية، الحساب بيضل معلّق لحد ما يتفعّل يدوياً
exports.registerAdmin = async (req, res) => {
  try {
    const { name, email, password, fcmToken } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'الاسم والبريد الإلكتروني وكلمة السر مطلوبين' });
    }

    const existingAdmin = await Admin.findOne({ email: email.toLowerCase() });
    if (existingAdmin) {
      return res.status(409).json({ message: 'يوجد حساب أدمن مسجّل بهذا البريد مسبقاً' });
    }

    // role ما بينبعت من الفرونت نهائياً — بيضل null لحد ما حدا يغيّرها يدوياً بالداتا بيز
    const admin = await Admin.create({
      name,
      email,
      password,
      fcmToken: fcmToken || null,
    });

    res.status(201).json({
      message: 'تم إنشاء الحساب، بانتظار تفعيل الصلاحية من الإدارة',
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'حدث خطأ أثناء إنشاء الحساب', error: error.message });
  }
};
// POST /api/admin/login
exports.loginAdmin = async (req, res) => {
  console.log("ADMIN LOGIN BODY:", req.body);
  try {
    const { email, password, fcmToken } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: 'البريد الإلكتروني وكلمة السر مطلوبين'
      });
    }

    const admin = await Admin.findOne({
      email: email.toLowerCase()
    }).select('+password');

    if (!admin) {
      return res.status(404).json({
        message: 'ما في حساب مسجّل بهذا البريد'
      });
    }

    const isMatch = await admin.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        message: 'كلمة السر غير صحيحة'
      });
    }

    if (!admin.role) {
      return res.status(403).json({
        message: 'حسابك تم إنشاؤه بنجاح بس لسا ما تفعّلت صلاحيتك. تواصل مع الإدارة.'
      });
    }

    // حفظ FCM Token
    if (fcmToken) {
      admin.fcmToken = fcmToken;
      await admin.save();
      console.log('✅ تم حفظ FCM Token للأدمن:', admin._id);
    }

    const token = generateToken(admin._id);

    res.status(200).json({
      message: 'تم تسجيل الدخول بنجاح',
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        fcmToken: admin.fcmToken || null,
      },
    });

  } catch (error) {
    console.error('Admin login error:', error);

    res.status(500).json({
      message: 'حدث خطأ أثناء تسجيل الدخول',
      error: error.message
    });
  }
};

// GET /api/admin/profile (محمي)
exports.getAdminProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.adminId);
    res.status(200).json({ admin });
  } catch (error) {
    res.status(500).json({ message: 'حدث خطأ', error: error.message });
  }
};

// PUT /api/admin/change-password (محمي)
exports.changeAdminPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'كلمة المرور الحالية والجديدة مطلوبتين' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل' });
    }

    const admin = await Admin.findById(req.adminId).select('+password');
    const isMatch = await admin.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: 'كلمة المرور الحالية غير صحيحة' });
    }

    admin.password = newPassword; // بتتشفر تلقائياً بالـ pre('save') hook
    await admin.save();

    res.status(200).json({ message: 'تم تغيير كلمة المرور بنجاح' });
  } catch (error) {
    res.status(500).json({ message: 'حدث خطأ أثناء تغيير كلمة المرور', error: error.message });
  }
};

// ── إدارة المدربين من طرف الأدمن ──

// GET /api/admin/trainers?search=xxx (محمي)
exports.listTrainersForAdmin = async (req, res) => {
  try {
    const { search } = req.query;
    const filter = search
      ? {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } },
          ],
        }
      : {};

    const trainers = await Trainer.find(filter).sort({ createdAt: -1 });
    res.status(200).json({ trainers });
  } catch (error) {
    res.status(500).json({ message: 'حدث خطأ أثناء جلب المدربين', error: error.message });
  }
};
// ── إدارة المستخدمين (اليوزرز) من طرف الأدمن ──

// GET /api/admin/users?search=xxx&page=1&limit=50 (محمي)
exports.listUsersForAdmin = async (req, res) => {
  try {
    const { search } = req.query;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const skip = (page - 1) * limit;

    const filter = search
      ? {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } },
          ],
        }
      : {};

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({ users });
  } catch (error) {
    res.status(500).json({ message: 'حدث خطأ أثناء جلب المستخدمين', error: error.message });
  }
};

// GET /api/admin/users/:id (محمي)
exports.getUserForAdmin = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'المستخدم غير موجود' });
    res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({ message: 'حدث خطأ', error: error.message });
  }
};
// GET /api/admin/trainers/:id (محمي)
exports.getTrainerForAdmin = async (req, res) => {
  try {
    const trainer = await Trainer.findById(req.params.id);
    if (!trainer) return res.status(404).json({ message: 'المدرب غير موجود' });
    res.status(200).json({ trainer });
  } catch (error) {
    res.status(500).json({ message: 'حدث خطأ', error: error.message });
  }
};

// PUT /api/admin/trainers/:id (محمي — full أو editor بس)
exports.updateTrainerForAdmin = async (req, res) => {
  try {
    const trainer = await Trainer.findById(req.params.id);
    if (!trainer) return res.status(404).json({ message: 'المدرب غير موجود' });

    const editable = [
      'name', 'phone', 'imageUrl', 'description', 'price',
      'duration', 'isAvailable', 'isBusy', 'balance', 'paymentsCount', 'code',
    ];

    editable.forEach((field) => {
      if (req.body[field] !== undefined) trainer[field] = req.body[field];
    });

    await trainer.save();
    res.status(200).json({ message: 'تم تحديث بيانات المدرب بنجاح', trainer });
  } catch (error) {
    res.status(500).json({ message: 'حدث خطأ أثناء التحديث', error: error.message });
  }
};
// GET /api/admin/admins (محمي — full بس)
exports.listAdminsForAdmin = async (req, res) => {
  try {
    const admins = await Admin.find({}).sort({ createdAt: -1 });
    res.status(200).json({ admins });
  } catch (error) {
    res.status(500).json({ message: 'حدث خطأ أثناء جلب الأدمنز', error: error.message });
  }
};

// PUT /api/admin/admins/:id (محمي — full بس)
exports.updateAdminForAdmin = async (req, res) => {
  try {
    const targetAdmin = await Admin.findById(req.params.id);
    if (!targetAdmin) {
      return res.status(404).json({ message: 'الحساب غير موجود' });
    }

    const { name, email, role } = req.body;

    if (name !== undefined) targetAdmin.name = name;
    if (email !== undefined) targetAdmin.email = email.toLowerCase();

    if (role !== undefined) {
      const validRoles = ['full', 'editor', 'viewer', null, ''];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ message: 'صلاحية غير صحيحة' });
      }
      // لو انبعتت فاضية، منحطها null (يعني تعليق الحساب)
      targetAdmin.role = role === '' ? null : role;
    }

    await targetAdmin.save();

    res.status(200).json({
      message: 'تم تحديث بيانات الأدمن بنجاح',
      admin: {
        id: targetAdmin._id,
        name: targetAdmin.name,
        email: targetAdmin.email,
        role: targetAdmin.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'حدث خطأ أثناء التحديث', error: error.message });
  }
};
// ── إحصائيات بسيطة من بيانات المدربين المتوفرة حالياً ──
// GET /api/admin/stats (محمي)
exports.getAdminStats = async (req, res) => {
  try {
    const trainers = await Trainer.find({});
    const totalTrainers = trainers.length;
    const availableTrainers = trainers.filter((t) => t.isAvailable).length;
    const busyTrainers = trainers.filter((t) => t.isBusy).length;
    const totalBalance = trainers.reduce((sum, t) => sum + (t.balance || 0), 0);
    const totalPayments = trainers.reduce((sum, t) => sum + (t.paymentsCount || 0), 0);

    res.status(200).json({
      totalTrainers,
      availableTrainers,
      busyTrainers,
      totalBalance,
      totalPayments,
    });
  } catch (error) {
    res.status(500).json({ message: 'حدث خطأ أثناء جلب الإحصائيات', error: error.message });
  }
};


// PUT /api/admin/users/:id (محمي)
exports.updateUserForAdmin = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'المستخدم غير موجود' });

    const { name, phone, email, rating, balance, sessionsCount, favoriteTrainers, password } = req.body;

    if (name !== undefined) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (email !== undefined) user.email = email.toLowerCase();
    if (rating !== undefined) user.rating = rating;
    if (balance !== undefined) user.balance = balance;
    if (sessionsCount !== undefined) user.completedSessions = sessionsCount;
    if (favoriteTrainers !== undefined) user.favoriteTrainers = favoriteTrainers;

    if (password && password.trim() !== '') {
      user.password = await bcrypt.hash(password.trim(), 10);
      user.authProvider = 'local'; // لو كان جوجل وحطينا كلمة سر، صار عندو دخول محلي كمان
    }

    await user.save();

    const updatedUser = await User.findById(user._id).select('-password');
    res.status(200).json({ message: 'تم تحديث بيانات المستخدم بنجاح', user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: 'حدث خطأ أثناء التحديث', error: error.message });
  }
};

// ══════════════════════════════════════════════════════
// ── إدارة الطلبات (النشاطات/الحجوزات) من طرف الأدمن ──
// ══════════════════════════════════════════════════════

// GET /api/admin/activities?customerName=&trainerName=&status=&search= (محمي)
// فلترة اختيارية حسب اسم الزبون، اسم المدرب، الحالة، أو بحث عام يطابق الاثنين معاً
exports.listActivitiesForAdmin = async (req, res) => {
  try {
    console.log("ADMIN ACTIVITIES CALLED");
    const { customerName, trainerName, status, search } = req.query;
    const filter = {};

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (customerName) {
      filter.customerName = { $regex: customerName, $options: 'i' };
    }

    if (trainerName) {
      filter.trainerName = { $regex: trainerName, $options: 'i' };
    }

    // بحث عام (مربع بحث واحد يطابق اسم الزبون أو اسم المدرب)
    if (search) {
      filter.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { trainerName: { $regex: search, $options: 'i' } },
      ];
    }

    const activities = await Activity.find(filter).sort({ sessionTime: -1 });
        console.log("ACTIVITIES COUNT:", activities.length);
    console.log(activities);
    res.status(200).json({ activities });
  } catch (error) {
        console.log("ERROR:", error);
    res.status(500).json({ message: error.message });

    res.status(500).json({ message: 'حدث خطأ أثناء جلب الطلبات', error: error.message });
  }
};
exports.getReportByEntity = async (req, res) => {
  try {

    const { type, id, from, to } = req.query;

    if (!type || !id) {
      return res.status(400).json({
        message: 'يجب تحديد النوع والمعرف'
      });
    }


    let query = {};

    if (type === 'trainer') {
      query.trainer = id;
    } else if (type === 'user') {
      query.customer = id;
    } else {
      return res.status(400).json({
        message: 'نوع غير صحيح'
      });
    }


    // نطاق التاريخ
    if (from || to) {

      query.sessionTime = {};

      if (from) {
        query.sessionTime.$gte = new Date(from);
      }

      if (to) {
        const endDate = new Date(to);
        endDate.setHours(23,59,59,999);

        query.sessionTime.$lte = endDate;
      }
    }


    const activities = await Activity.find(query)
      .sort({sessionTime:-1});


    const totalAmount = activities.reduce(
      (sum,a)=>sum+(a.paidAmount || 0),
      0
    );


    const totalCount = activities.length;

    const paidCount = activities.filter(
      a=>a.isPaid
    ).length;


    res.json({
      success:true,
      activities,
      totalAmount,
      totalCount,
      paidCount
    });


  } catch(error){

    res.status(500).json({
      message:error.message
    });

  }
};
// PUT /api/admin/activities/:id/status (محمي — full أو editor بس)
// تحديث حالة طلب: موافقة (approved) / رفض (rejected) / إلغاء (cancelled) / إنهاء (completed)
exports.updateActivityStatusForAdmin = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'approved', 'rejected', 'cancelled', 'completed'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'حالة غير صحيحة' });
    }

    const activity = await Activity.findById(req.params.id);
    if (!activity) {
      return res.status(404).json({ message: 'الطلب غير موجود' });
    }

    const now = new Date();

    activity.status = status;
    activity.actionBy = (status === 'rejected' || status === 'cancelled') ? 'admin' : null;

    if (status === 'approved') {
      activity.approvedAt = now;
    } else if (status === 'rejected') {
      activity.rejectedAt = now;
    } else if (status === 'cancelled') {
      activity.cancelledAt = now;
    } else if (status === 'completed') {
      activity.completedAt = now;
    }

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
await activity.save();

// ⬅️ جديد — إعلام الزبون فوراً
emitActivityChange(activity.customer.toString(), {
  type: 'updated',
  activityId: activity._id.toString(),
});

// ⬅️ جديد — إشعار المدرب بتغيير الحالة من الأدمن
try {
  const statusText = {
    approved: 'وافق على',
    rejected: 'رفض',
    cancelled: 'ألغى',
    completed: 'أكمل',
  };

  const actionText = statusText[status] || 'غيّر حالة';

  const trainerDoc = await Trainer.findById(activity.trainer).select('fcmToken');

  if (trainerDoc?.fcmToken) {
    const notificationTitle = 'تحديث حالة الطلب';
    const notificationBody = `الإدارة ${actionText} طلب حجز الزبون ${activity.customerName}`;

    const notificationData = {
      type: 'booking_status_updated',
      activityId: activity._id.toString(),
      status: status,
    };

    await sendPushToToken(
      trainerDoc.fcmToken,
      notificationTitle,
      notificationBody,
      notificationData
    );

    console.log('✅ تم إرسال إشعار المدرب بتغيير الحالة');
  } else {
    console.log('⚠️ المدرب لا يملك FCM Token');
  }
} catch (notifError) {
  console.error('❌ خطأ إرسال إشعار المدرب:', notifError);
}

res.status(200).json({ message: 'تم تحديث حالة الطلب بنجاح', activity });
  } catch (error) {
    res.status(500).json({ message: 'حدث خطأ أثناء تحديث الطلب', error: error.message });
  }
};
// DELETE /api/admin/activities/:id (محمي — full أو editor بس)
exports.deleteActivityForAdmin = async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id);
    if (!activity) {
      return res.status(404).json({ message: 'الطلب غير موجود' });
    }

    if (activity.zoomMeetingId) {
      await deleteZoomMeeting(activity.zoomMeetingId);
    }

    await activity.deleteOne();

    emitActivityChange(activity.customer.toString(), {
      type: 'deleted',
      activityId: activity._id.toString(),
    });

    res.status(200).json({ message: 'تم حذف الطلب بنجاح' });
  } catch (error) {
    res.status(500).json({ message: 'حدث خطأ أثناء حذف الطلب', error: error.message });
  }
};