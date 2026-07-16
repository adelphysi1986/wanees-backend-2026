const express = require('express');
const router = express.Router();
const Activity = require('../models/Activity');

// ⚠️ عدّل هاد السطر حسب اسم/مكان الميدل وير الحقيقي عندك يلي بيتحقق من
// 'auth_token' الخاص بالزبون ويحط req.user = { id: ... }
const verifyUserToken = require('../middleware/userAuthMiddleware');
// ═══════════════════════════════════════════
// GET /api/customer/activities
// نشاط الزبون المسجل دخول فقط — هاد المطلوب حاليًا
// ═══════════════════════════════════════════
router.get('/customer/activities', verifyUserToken, async (req, res) => {  try {
    const activities = await Activity.find({ customer: req.userId })
      .sort({ sessionTime: -1 })
      .lean();
    res.json({ activities });
  } catch (err) {
    res.status(500).json({ message: 'صار خطأ أثناء جلب النشاطات' });
  }
});

// ═══════════════════════════════════════════
// TODO لاحقًا (لوحة الأدمن والمدرب) — الموديل جاهز، بس بدنا نربط
// الميدل وير الصحيح لكل واحد منهم قبل ما نفعّلهم:
// ═══════════════════════════════════════════

// GET /api/admin/activities?customerId=&trainerId=
// كل النشاطات، قابلة للفلترة حسب الزبون أو المدرب
//
// router.get('/admin/activities', authAdmin, async (req, res) => {
//   const { customerId, trainerId } = req.query;
//   const filter = {};
//   if (customerId) filter.customer = customerId;
//   if (trainerId) filter.trainer = trainerId;
//   const activities = await Activity.find(filter).sort({ sessionTime: -1 }).lean();
//   res.json({ activities });
// });

// GET /api/trainer/activities
// نشاط المدرب الشخصي فقط
//
// router.get('/trainer/activities', authTrainer, async (req, res) => {
//   const activities = await Activity.find({ trainer: req.trainer.id })
//     .sort({ sessionTime: -1 })
//     .lean();
//   res.json({ activities });
// });

// PUT /api/activities/:id/reject   → status: 'rejected', actionBy: 'admin' | 'trainer'
// PUT /api/activities/:id/cancel   → status: 'cancelled', actionBy: 'admin' | 'trainer'
// PUT /api/activities/:id/complete → status: 'completed' (مش مهم مين ضغط الزر)

module.exports = router;