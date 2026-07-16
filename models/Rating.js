const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema(
  {
    trainer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trainer',
      required: true,
      index: true,
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },

    comment: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { timestamps: true }
);

ratingSchema.index({ trainer: 1, customer: 1 }, { unique: true });

module.exports = mongoose.model('Rating', ratingSchema);