const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, default: '', trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, default: null }, // فاضي لو المستخدم داخل عبر جوجل
    description: { type: String, default: '' },
    avatar: { type: String, default: '' },
   balance: { type: Number, default: 0 },
    authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
    googleId: { type: String, default: null },
        fcmToken: { type: String, default: '' },

// models/User.js
// ضيف هاد السطر جوا الـ schema، مع باقي الحقول:
// models/User.js
code: {
  type: String,
  default: '',
  trim: true,
},
    // قيم افتراضية تُنشأ مع الحساب
    completedSessions: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },
    favoriteTrainers: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'Trainer', default: [] },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);