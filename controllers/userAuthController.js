const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const axios = require('axios'); // تأكد إنه مثبتة: npm install axios
const Activity = require('../models/Activity');
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '30d' });

const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  phone: user.phone,
  email: user.email,
  description: user.description,
  avatar: user.avatar,
  authProvider: user.authProvider,
  completedSessions: user.completedSessions,
  rating: user.rating,
  favoriteTrainers: user.favoriteTrainers,
});

// ── تسجيل حساب جديد (إيميل + كلمة سر) ──
exports.register = async (req, res) => {
  try {
    const { name, phone, email, password, description } = req.body;

    if (!name || !phone || !email || !password) {
      return res.status(400).json({ message: 'الرجاء تعبئة كل الحقول المطلوبة' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: 'يوجد حساب مسجل بهذا البريد الإلكتروني مسبقاً' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      phone,
      email: email.toLowerCase(),
      password: hashedPassword,
      description: description || '',
      authProvider: 'local',
    });

    const token = generateToken(user._id);
    res.status(201).json({ token, user: sanitizeUser(user) });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'حدث خطأ أثناء إنشاء الحساب' });
  }
};

// ── تسجيل الدخول (إيميل + كلمة سر) ──
exports.login = async (req, res) => {
  console.log("LOGIN BODY:", req.body);

  try {
    const { email, password, fcmToken } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'الرجاء إدخال البريد الإلكتروني وكلمة السر' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user || user.authProvider !== 'local' || !user.password) {
      return res.status(401).json({ message: 'هذا الحساب مسجل عبر جوجل، سجل الدخول من هناك' });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: 'البريد الإلكتروني أو كلمة السر غير صحيحة' });
    }


    // حفظ FCM Token
    if (fcmToken) {
      user.fcmToken = fcmToken;
      await user.save();

      console.log("✅ تم حفظ FCM Token للمستخدم:", fcmToken);
    }


    const token = generateToken(user._id);

    res.json({
      token,
      user: sanitizeUser(user)
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'حدث خطأ أثناء تسجيل الدخول' });
  }
};
// ── تسجيل الدخول / إنشاء حساب عبر جوجل ──

// ── تسجيل الدخول / إنشاء حساب عبر جوجل ──
exports.googleAuth = async (req, res) => {
  try {
    const { accessToken } = req.body;
    if (!accessToken) {
      return res.status(400).json({ message: 'accessToken مفقود' });
    }

    // تحقق من التوكن مباشرة من جوجل وجيب بيانات المستخدم
    const googleResponse = await axios.get(
      'https://www.googleapis.com/oauth2/v3/userinfo',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const payload = googleResponse.data;

    if (!payload?.email) {
      return res.status(401).json({ message: 'تعذر التحقق من حساب جوجل' });
    }

    let user = await User.findOne({ email: payload.email.toLowerCase() });

    if (!user) {
      user = await User.create({
        name: payload.name || 'مستخدم',
        phone: '',
        email: payload.email.toLowerCase(),
        password: null,
        avatar: payload.picture || '',
        authProvider: 'google',
        googleId: payload.sub,
      });
    } else if (user.authProvider !== 'google') {
      user.authProvider = 'google';
      user.googleId = payload.sub;
      if (!user.avatar) user.avatar = payload.picture || '';
      await user.save();
    }

    const token = generateToken(user._id);
    res.json({ token, user: sanitizeUser(user) });
  } catch (err) {
    console.error('Google auth error:', err?.response?.data || err.message);
    res.status(401).json({ message: 'فشل التحقق من حساب جوجل' });
  }
};
// ── بيانات المستخدم الحالي (لِـ /me أو تحميل الداشبورد) ──
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'المستخدم غير موجود' });
    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    res.status(500).json({ message: 'حدث خطأ أثناء جلب البيانات' });
  }
};

// ضيف هاد بآخر الملف، بعد كل الدوال الموجودة (register, login, googleAuth, getMe...)

exports.getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ message: 'المستخدم غير موجود' });
    }

    res.json({
      success: true,
      user: {
        name: user.name,
        phone: user.phone,
        avatar: user.avatar,
        code: user.code,
      },
    });
  } catch (error) {
    console.log('خطأ بجلب بيانات الحساب:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.updateMyCode = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code || code.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'يرجى إدخال كود صحيح',
      });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'المستخدم غير موجود' });
    }

    user.code = code.trim();
    await user.save();

    res.json({
      success: true,
      message: 'تم حفظ الكود بنجاح',
      code: user.code,
    });
  } catch (error) {
    console.log('خطأ بحفظ الكود:', error);
    res.status(500).json({ message: error.message });
  }
};
exports.getUserConfirmedBookings = async (req, res) => {
  try {
    const userId = req.userId; // جاي من الميدل وير بتاع تسجيل دخول الزبون

    const confirmedBookings = await Activity.find({
      customer: userId,
      status: 'approved',
    }).sort({ sessionTime: -1 });

    res.status(200).json({
      success: true,
      count: confirmedBookings.length,
      activities: confirmedBookings,
    });
  } catch (error) {
    console.error('❌ خطأ بجلب الطلبات المؤكدة:', error);
    res.status(500).json({ message: error.message });
  }
};
// إضافة/إزالة مدرب من المفضلة (Toggle)
exports.toggleFavoriteTrainer = async (req, res) => {
  try {
    const { trainerId } = req.params;

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'المستخدم غير موجود' });
    }

    const index = user.favoriteTrainers.findIndex(
      (id) => id.toString() === trainerId
    );

    let isFavorite;
    if (index > -1) {
      // موجود أصلاً → احذفه (إزالة من المفضلة)
      user.favoriteTrainers.splice(index, 1);
      isFavorite = false;
    } else {
      // مش موجود → ضيفه (إضافة للمفضلة)
      user.favoriteTrainers.push(trainerId);
      isFavorite = true;
    }

    await user.save();

    res.json({
      success: true,
      isFavorite,
      message: isFavorite ? 'تمت الإضافة إلى المفضلة' : 'تمت الإزالة من المفضلة',
    });
  } catch (error) {
    console.log('خطأ بتحديث المفضلة:', error);
    res.status(500).json({ message: error.message });
  }
};

// جلب قائمة المدربين المفضلين
exports.getMyFavoriteTrainers = async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate('favoriteTrainers');

    if (!user) {
      return res.status(404).json({ message: 'المستخدم غير موجود' });
    }

    res.json({
      success: true,
      trainers: user.favoriteTrainers,
    });
  } catch (error) {
    console.log('خطأ بجلب المفضلة:', error);
    res.status(500).json({ message: error.message });
  }
};