const mongoose = require('mongoose');

// رابط زوم افتراضي مؤقت — بيتحط تلقائيًا على أي نشاط جديد لحد ما يصير في نظام
// لتوليد/تعيين روابط زوم ديناميكية لكل مدرب أو كل جلسة.
const DEFAULT_ZOOM_LINK = 'https://zoom.us/j/0000000000';

const activitySchema = new mongoose.Schema(
  {
    // الزبون صاحب الحجز
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    customerName: { type: String, required: true },

    // المدرب المحجوز عنده
    trainer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trainer',
      required: true,
      index: true,
    },
    trainerName: { type: String, required: true },
    description: { type: String, default: "", },

    // وقت بداية الجلسة المحجوزة
    sessionTime: { type: Date, required: true },

    // رابط الزوم
    zoomLink: { type: String, default: DEFAULT_ZOOM_LINK },
    zoomMeetingId: { type: String, default: null },

    // حالة النشاط
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled', 'completed'],
      default: 'pending',
      index: true,
    },
isPaid: {
  type: Boolean,
  default: false,
},
paidAmount: {
  type: Number,
  default: 0,
},
paidAt: {
  type: Date,
  default: null,
},
    // مين رفض أو ألغى النشاط
    actionBy: {
      type: String,
      enum: ['admin', 'trainer', null],
      default: null,
    },

    // ── توقيت كل قرار ── (createdAt الطلب نفسه بييجي أوتوماتيكي من timestamps)
    approvedAt: { type: Date, default: null },
    rejectedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

activitySchema.index({ customer: 1, sessionTime: -1 });
activitySchema.index({ trainer: 1, sessionTime: -1 });

activitySchema.statics.DEFAULT_ZOOM_LINK = DEFAULT_ZOOM_LINK;

module.exports = mongoose.model('Activity', activitySchema);