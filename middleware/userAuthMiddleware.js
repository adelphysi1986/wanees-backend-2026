const jwt = require('jsonwebtoken');

module.exports = function verifyUserToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'غير مصرح، الرجاء تسجيل الدخول' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'الجلسة منتهية، الرجاء تسجيل الدخول مجدداً' });
  }
};