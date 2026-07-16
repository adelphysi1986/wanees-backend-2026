const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const adminSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'الاسم مطلوب'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'البريد الإلكتروني مطلوب'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, 'كلمة السر مطلوبة'],
      minlength: 6,
      select: false,
    },
    // ── الصلاحية — بدون قيمة افتراضية، لازم تتحدد يدوياً من الداتا بيز ──
    role: {
      type: String,
      enum: ['full', 'editor', 'viewer'], // كامل الصلاحية / محرر / متابع
      default: null,
    },
        fcmToken: { type: String, default: '' },

  },
  { timestamps: true }
);

adminSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

adminSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Admin', adminSchema);