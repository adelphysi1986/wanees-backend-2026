const Rating = require('../models/Rating');
const Trainer = require('../models/Trainer');
// جلب كل التقييمات بالنظام (لكل المدربين)
// جلب كل التقييمات بالنظام (مع Pagination)
exports.getAllRatings = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const totalRatings = await Rating.countDocuments();

    const ratings = await Rating.find()
      .populate('customer', 'name avatar')
      .populate('trainer', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      ratings,
      currentPage: page,
      totalPages: Math.ceil(totalRatings / limit),
      totalRatings,
      hasMore: skip + ratings.length < totalRatings,
    });

  } catch (error) {
    console.log('خطأ بجلب كل التقييمات:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
exports.createRating = async (req, res) => {
  try {
    const { trainerId } = req.params;
    const { rating, comment } = req.body;
    const customerId = req.userId;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'يرجى تحديد تقييم صحيح من 1 إلى 5',
      });
    }

    const trainer = await Trainer.findById(trainerId);
    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: 'المدرب غير موجود',
      });
    }

    const existingRating = await Rating.findOne({
      trainer: trainerId,
      customer: customerId,
    });

    if (existingRating) {
      return res.status(400).json({
        success: false,
        message: 'لقد قمت بتقييم هذا المدرب مسبقاً',
      });
    }

    const newRating = await Rating.create({
      trainer: trainerId,
      customer: customerId,
      rating,
      comment: comment || '',
    });

    // 👇 حساب المعدل الجديد وتحديثه مباشرة على المدرب
    const allRatings = await Rating.find({ trainer: trainerId }).select('rating');
    const avgRating =
      allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length;

    trainer.rating = Number(avgRating.toFixed(1));
    trainer.reviews = allRatings.length;
    await trainer.save();

    res.status(201).json({
      success: true,
      rating: newRating,
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'لقد قمت بتقييم هذا المدرب مسبقاً',
      });
    }

    console.log('خطأ بإنشاء التقييم:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
// جلب كل تقييمات مدرب معيّن (مع بيانات الزبون عبر populate)
// جلب تقييمات مدرب معيّن (مع Pagination)
exports.getTrainerRatings = async (req, res) => {
  try {
    const { trainerId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const totalRatings = await Rating.countDocuments({ trainer: trainerId });

    const ratings = await Rating.find({ trainer: trainerId })
      .populate('customer', 'name avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const allRatingsForAvg = await Rating.find({ trainer: trainerId }).select('rating');
    const avgRating =
      allRatingsForAvg.length > 0
        ? allRatingsForAvg.reduce((sum, r) => sum + r.rating, 0) / allRatingsForAvg.length
        : 0;

    res.json({
      success: true,
      ratings,
      averageRating: Number(avgRating.toFixed(1)),
      totalRatings,
      currentPage: page,
      hasMore: skip + ratings.length < totalRatings,
    });

  } catch (error) {
    console.log('خطأ بجلب التقييمات:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
// جلب كل تقييمات مدرب معيّن
