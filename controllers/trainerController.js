const jwt = require('jsonwebtoken');
const Trainer = require('../models/Trainer');
const Activity = require('../models/Activity');
const User = require('../models/User');
const generateToken = (trainerId) => {
  return jwt.sign({ id: trainerId }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};
exports.getReportByTrainerCode = async (req, res) => {
  try {
    const trainerId = req.trainerId;
    const { from, to } = req.query;

    const trainer = await Trainer.findById(trainerId).select('code');

    if (!trainer || !trainer.code) {
      return res.status(200).json({
        success: true,
        activities: [],
        totalAmount: 0,
        platformShare: 0,
        totalCount: 0,
      });
    }

    const usersWithCode = await User.find({ code: trainer.code }).select('_id name');
    const userIds = usersWithCode.map((u) => u._id);

    if (userIds.length === 0) {
      return res.status(200).json({
        success: true,
        activities: [],
        totalAmount: 0,
        platformShare: 0,
        totalCount: 0,
      });
    }

    const query = {
      customer: { $in: userIds },
      isPaid: true,
    };

    if (from || to) {
      query.sessionTime = {};
      if (from) query.sessionTime.$gte = new Date(from);
      if (to) query.sessionTime.$lte = new Date(to);
    }

    const activities = await Activity.find(query).sort({ sessionTime: -1 });

    const totalAmount = activities.reduce((sum, a) => sum + (a.paidAmount || 0), 0);
    const platformShare = totalAmount * 0.2;

    res.status(200).json({
      success: true,
      activities,
      totalAmount,
      platformShare,
      totalCount: activities.length,
    });
  } catch (error) {
    console.error('❌ خطأ بجلب تقرير الكود:', error);
    res.status(500).json({ message: error.message });
  }
};
exports.getTrainerReport = async (req, res) => {
  try {

    const trainerId = req.trainerId;

    const { from, to } = req.query;


    let query = {
      trainer: trainerId
    };


    if (from || to) {

      query.sessionTime = {};

      if (from) {
        query.sessionTime.$gte = new Date(from);
      }


      if (to) {

        const end = new Date(to);
        end.setHours(23,59,59,999);

        query.sessionTime.$lte = end;
      }

    }



    const activities = await Activity.find(query)
      .sort({sessionTime:-1});



    const totalAmount = activities.reduce(
      (sum,a)=> sum + (a.paidAmount || 0),
      0
    );


    const totalCount = activities.length;


    const paidCount = activities.filter(
      a=>a.isPaid
    ).length;


    const unpaidCount = totalCount - paidCount;



    res.json({

      success:true,

      totalCount,

      paidCount,

      unpaidCount,

      totalAmount,

      activities

    });


  } catch(error){

    res.status(500).json({
      message:error.message
    });

  }
};


exports.getAllTrainers = async (req, res) => {
    try {
        const requesterId = req.trainerId; // من authMiddleware لو موجود
        const isAdmin = req.isAdmin === true;

        const trainers = await Trainer.find({}, { password: 0, __v: 0 }).lean();

        if (isAdmin) {
            return res.status(200).json(trainers);
        }

        const sanitized = trainers.map(t => {
            const isOwner = requesterId && t._id.toString() === requesterId.toString();
            if (isOwner) return t;

            const { balance, paymentsCount, code, ...publicData } = t;
            return publicData;
        });

        res.status(200).json(sanitized);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
// POST /api/trainers/register
exports.registerTrainer = async (req, res) => {
  try {
    const { name, phone, password, fcmToken } = req.body;

    if (!name || !phone || !password) {
      return res.status(400).json({ message: 'الاسم ورقم الجوال وكلمة السر مطلوبين' });
    }

    const existingTrainer = await Trainer.findOne({ phone });
    if (existingTrainer) {
      return res.status(409).json({ message: 'يوجد حساب مدرب مسجّل بهذا الرقم مسبقاً' });
    }

    const trainer = await Trainer.create({
      name,
      phone,
      password,
      fcmToken: fcmToken || null,
    });

    const token = generateToken(trainer._id);

    res.status(201).json({
      message: 'تم إنشاء حساب المدرب بنجاح',
      token,
      trainer: {
        id: trainer._id,
        name: trainer.name,
        phone: trainer.phone,
        fcmToken: trainer.fcmToken || null,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'حدث خطأ أثناء إنشاء الحساب', error: error.message });
  }
};

// POST /api/trainers/login
exports.loginTrainer = async (req, res) => {
  console.log("TRAINER LOGIN BODY:", req.body);
  try {
    const { phone, password, fcmToken } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ message: 'رقم الجوال وكلمة السر مطلوبين' });
    }

    // .select('+password') لازم لأن الموديل حاطط select: false على الباسورد
    const trainer = await Trainer.findOne({ phone }).select('+password');
    if (!trainer) {
      return res.status(404).json({ message: 'ما في حساب مسجّل بهذا الرقم' });
    }

    const isMatch = await trainer.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'كلمة السر غير صحيحة' });
    }

    // حفظ FCM Token
    if (fcmToken) {
      trainer.fcmToken = fcmToken;
      await trainer.save();
      console.log('✅ تم حفظ FCM Token للمدرب:', trainer._id);
    }

    const token = generateToken(trainer._id);

    res.status(200).json({
      message: 'تم تسجيل الدخول بنجاح',
      token,
      trainer: {
        id: trainer._id,
        name: trainer.name,
        phone: trainer.phone,
        imageUrl: trainer.imageUrl,
        isAvailable: trainer.isAvailable,
        fcmToken: trainer.fcmToken || null,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'حدث خطأ أثناء تسجيل الدخول', error: error.message });
  }
};

// GET /api/trainers/profile (محمي بالتوكن)
exports.getProfile = async (req, res) => {
  try {
    const trainer = await Trainer.findById(req.trainerId);
    if (!trainer) {
      return res.status(404).json({ message: 'الحساب غير موجود' });
    }
    res.status(200).json({ trainer });
  } catch (error) {
    res.status(500).json({ message: 'حدث خطأ أثناء جلب البيانات', error: error.message });
  }
};

// PUT /api/trainers/profile (محمي بالتوكن)
exports.updateProfile = async (req, res) => {
  try {
    const {
      name,
      phone,
      imageUrl,
      description,
      price,
      duration,
      isAvailable,
      isBusy,
      balance,
      paymentsCount,
      code,
      password, // كلمة المرور الجديدة (اختيارية)
    } = req.body;

    const trainer = await Trainer.findById(req.trainerId);
    if (!trainer) {
      return res.status(404).json({ message: 'الحساب غير موجود' });
    }

    if (name !== undefined) trainer.name = name;
    if (phone !== undefined) trainer.phone = phone;
    if (imageUrl !== undefined) trainer.imageUrl = imageUrl;
    if (description !== undefined) trainer.description = description;
    if (price !== undefined) trainer.price = price;
    if (duration !== undefined) trainer.duration = duration;
    if (isAvailable !== undefined) trainer.isAvailable = isAvailable;
    if (isBusy !== undefined) trainer.isBusy = isBusy;
    if (balance !== undefined) trainer.balance = balance;
    if (paymentsCount !== undefined) trainer.paymentsCount = paymentsCount;
    if (code !== undefined) trainer.code = code;

    // إذا بعت كلمة مرور جديدة، امنع تحديثها إذا كانت فاضية أو أقل من 6 أحرف
    if (password && password.trim().length > 0) {
      if (password.length < 6) {
        return res.status(400).json({ message: 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل' });
      }
      trainer.password = password; // بيتشفر تلقائياً بالـ pre('save') hook
    }

    await trainer.save();

    res.status(200).json({
      message: 'تم تحديث الملف الشخصي بنجاح',
      trainer,
    });
  } catch (error) {
    res.status(500).json({ message: 'حدث خطأ أثناء التحديث', error: error.message });
  }
};