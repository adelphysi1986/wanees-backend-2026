require('dotenv').config();
const mongoose = require('mongoose');
const dns = require('dns');

dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Rating = require('./models/Rating');
const User = require('./models/User');
const Trainer = require('./models/Trainer');

const sampleComments = [
  'مدرب ممتاز، شرح واضح وصبور جداً',
  'استفدت كثير من الجلسات، أنصح فيه بشدة',
  'محترف وملتزم بالمواعيد',
  'تجربة رائعة، يهتم بتفاصيل كل شخص',
  'أسلوبه بالتدريب مريح ومحفز',
  'كان في تأخير بسيط لكن المحتوى كان ممتاز',
  'أفضل مدرب تعاملت معه',
  'أنصح أي شخص يجرب التدريب معه',
  'التزام عالي ونتائج ممتازة',
  'شرح سهل وواضح',
  'تعامل راقي وأسلوب احترافي',
  'الجلسات كانت مفيدة جداً',
  'ساعدني أوصل لهدفي',
  'ممتاز ويستحق خمس نجوم',
  'تجربة أكثر من رائعة'
];

async function seedRatings() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ تم الاتصال بقاعدة البيانات');

    const trainers = await Trainer.find();
    const users = await User.find();

    if (!trainers.length) {
      console.log('❌ لا يوجد مدربين');
      return process.exit(1);
    }

    if (!users.length) {
      console.log('❌ لا يوجد مستخدمين');
      return process.exit(1);
    }

    // حذف التقييمات القديمة
    await Rating.deleteMany({});

    const ratings = [];

    for (const trainer of trainers) {
      for (const user of users) {
        ratings.push({
          trainer: trainer._id,
          customer: user._id,
          rating: Math.floor(Math.random() * 5) + 1,
          comment:
            sampleComments[
              Math.floor(Math.random() * sampleComments.length)
            ],
        });
      }
    }

    await Rating.insertMany(ratings);

    console.log(`✅ تم إنشاء ${ratings.length} تقييم بنجاح`);
    console.log(`👥 عدد المستخدمين: ${users.length}`);
    console.log(`🏋️ عدد المدربين: ${trainers.length}`);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seedRatings();