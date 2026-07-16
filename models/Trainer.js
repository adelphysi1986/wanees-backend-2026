const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const trainerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'الاسم مطلوب'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'رقم الجوال مطلوب'],
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'كلمة السر مطلوبة'],
      minlength: 6,
      select: false,
    },
    imageUrl: {
      type: String,
      default: '',
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    price: {
      type: Number,
      default: 0,
      min: 0,
    },
    duration: {
      type: Number,
      default: 60,
      min: 1,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    isBusy: {
      type: Boolean, // التحكم بالانشغال: true = مشغول، false = فعال
      default: false,
    },
    balance: {
      type: Number, // الرصيد
      default: 0,
    },
    paymentsCount: {
      type: Number, // عدد الدفعات
      default: 0,
    },
    code: {
      type: String, // كود خاص بالمدرب
      default: '',
      trim: true,
    },
        role: {
      type: String,
      enum: ['full', 'editor', 'viewer'], // كامل الصلاحية / محرر / متابع
      default: 'viewer',
    },
    specialty: {
    type: String,
    default: "",
},
    fcmToken: { type: String, default: '' },

rating: {
    type: Number,
    default: 0,
},

reviews: {
    type: Number,
    default: 0,
},
  },


  { timestamps: true }
);

// بدون next كباراميتر، وبدون استدعاء next() — async بس
trainerSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

trainerSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Trainer', trainerSchema);