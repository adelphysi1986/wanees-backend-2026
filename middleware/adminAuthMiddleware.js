const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

exports.protectAdmin = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'ما في توكن، الرجاء تسجيل الدخول' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await Admin.findById(decoded.id);

    if (!admin || !admin.role) {
      return res.status(403).json({ message: 'حسابك ما إله صلاحية مفعّلة بعد' });
    }

    req.adminId = admin._id;
    req.adminRole = admin.role;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'التوكن غير صالح أو منتهي' });
  }
};

// يسمح بالمرور بس لصلاحيات محددة (مثلاً: فقط full أو editor يقدروا يعدلوا)
exports.requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.adminRole)) {
      return res.status(403).json({ message: 'ما عندك صلاحية كافية لهاي العملية' });
    }
    next();
  };
};