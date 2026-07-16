require("dotenv").config();
require('./controllers/cleanZoomMeetings');
require('./controllers/trainerBusyChecker');
const express = require("express");
const http = require("http");
const cors = require("cors");
const dns = require("dns");
const multer = require("multer");
const streamifier = require("streamifier");
const { deleteZoomMeeting } = require('./controllers/zoomService');
const Activity = require('./models/Activity');
const connectDB = require("./config/database");
const cloudinary = require("./cloudinary");
const { initSocket } = require("./socket"); // ⬅️ جديد

// ── إضافات FCM Token ──
const { protectAdmin } = require('./middleware/adminAuthMiddleware');
const { protect: protectTrainer } = require('./middleware/authMiddleware');
const verifyUserToken = require('./middleware/userAuthMiddleware');
const Admin = require('./models/Admin');
const Trainer = require('./models/Trainer');
const User = require('./models/User');

const app = express();
const server = http.createServer(app); // ⬅️ جديد — بديل app.listen المباشر

dns.setServers(["8.8.8.8", "8.8.4.4"]);

connectDB();

app.use(cors());
app.use(express.json());



const upload = multer({ storage: multer.memoryStorage() });
app.use('/api', require('./routes/activityRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/bookings', require('./routes/bookingRoutes'));
app.use('/api/trainers', require('./routes/trainerRoutes'));
app.use('/api/trainers', require('./routes/ratingRoutes'));
app.get("/", (req, res) => {
  res.send("Backend Running");
});
app.use(require('./fcmRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.post("/upload", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file" });
  }

  const stream = cloudinary.uploader.upload_stream(
    { folder: "my_app" },
    (error, result) => {
      if (error) return res.status(500).json(error);

      res.json({ url: result.secure_url });
    }
  );

  streamifier.createReadStream(req.file.buffer).pipe(stream);
});

// ══════════════════════════════════════════
// ── راوتات حفظ FCM Token (أدمن / ترينر / يوزر) ──
// ══════════════════════════════════════════

// أدمن
app.post('/api/admin/fcm-token', protectAdmin, async (req, res) => {
  try {
    const { fcmToken } = req.body;

    if (!fcmToken) {
      return res.status(400).json({ message: 'fcmToken مطلوب' });
    }

    await Admin.findByIdAndUpdate(req.adminId, { fcmToken });

    console.log('✅ تم حفظ FCM token للأدمن:', req.adminId);
    res.status(200).json({ success: true, message: 'تم حفظ FCM token' });
  } catch (error) {
    console.error('❌ خطأ بحفظ fcmToken للأدمن:', error);
    res.status(500).json({ message: 'خطأ بالسيرفر' });
  }
});

// ترينر
app.post('/api/trainers/fcm-token', protectTrainer, async (req, res) => {
  try {
    const { fcmToken } = req.body;

    if (!fcmToken) {
      return res.status(400).json({ message: 'fcmToken مطلوب' });
    }

    await Trainer.findByIdAndUpdate(req.trainerId, { fcmToken });

    console.log('✅ تم حفظ FCM token للمدرب:', req.trainerId);
    res.status(200).json({ success: true, message: 'تم حفظ FCM token' });
  } catch (error) {
    console.error('❌ خطأ بحفظ fcmToken للمدرب:', error);
    res.status(500).json({ message: 'خطأ بالسيرفر' });
  }
});

// يوزر
app.post('/api/users/fcm-token', verifyUserToken, async (req, res) => {
  try {
    const { fcmToken } = req.body;

    if (!fcmToken) {
      return res.status(400).json({ message: 'fcmToken مطلوب' });
    }

    await User.findByIdAndUpdate(req.userId, { fcmToken });

    console.log('✅ تم حفظ FCM token لليوزر:', req.userId);
    res.status(200).json({ success: true, message: 'تم حفظ FCM token' });
  } catch (error) {
    console.error('❌ خطأ بحفظ fcmToken لليوزر:', error);
    res.status(500).json({ message: 'خطأ بالسيرفر' });
  }
});

initSocket(server); // ⬅️ جديد — تفعيل السوكيت فوق نفس السيرفر

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => { // ⬅️ تغيير من app.listen إلى server.listen
  console.log("Server running on port " + PORT);
});