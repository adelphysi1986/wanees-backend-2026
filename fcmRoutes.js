const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Trainer = require('./models/Trainer');
const Admin = require('./models/Admin');
const User = require('./models/User');

// تخمين نوع المستخدم من التوكن نفسه بدون middleware منفصل
router.put('/api/update-fcm-token', async (req, res) => {
  try {
    const { fcmToken } = req.body;
    const authHeader = req.headers.authorization;

    if (!fcmToken) {
      return res.status(400).json({ message: 'fcmToken مطلوب' });
    }
    if (!authHeader) {
      return res.status(401).json({ message: 'غير مصرح' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    // نجرب نلاقيه بأي موديل من التلاتة
    let updated =
      (await Trainer.findByIdAndUpdate(userId, { fcmToken })) ||
      (await Admin.findByIdAndUpdate(userId, { fcmToken })) ||
      (await User.findByIdAndUpdate(userId, { fcmToken }));

    if (!updated) {
      return res.status(404).json({ message: 'المستخدم غير موجود' });
    }

    console.log('✅ تم تحديث FCM Token:', userId);
    res.status(200).json({ message: 'تم تحديث التوكن بنجاح' });
  } catch (error) {
    console.error('❌ خطأ تحديث FCM Token:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;