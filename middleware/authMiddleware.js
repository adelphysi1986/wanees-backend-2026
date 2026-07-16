const jwt = require('jsonwebtoken');

exports.protect = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'ما في توكن، الرجاء تسجيل الدخول' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.trainerId = decoded.id;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'التوكن غير صالح أو منتهي' });
  }
};