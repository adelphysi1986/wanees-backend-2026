const { messaging } = require("./firebaseAdmin");
const Trainer = require("./models/Trainer");
const Admin = require("./models/Admin");
const User = require("./models/User");

/**
 * إرسال إشعار لجهاز واحد
 * ownerId و ownerType اختياريان، بس لو انبعتوا بيسمحوا بمسح الرمز الميت من صاحبه الحقيقي بس
 */
async function sendPushToToken(fcmToken, title, body, data = {}, ownerId = null, ownerType = null) {
  if (!fcmToken) {
    console.log("⚠️ لا يوجد رمز جهاز");
    return;
  }

  const stringifiedData = {};
  Object.keys(data).forEach((key) => {
    stringifiedData[key] = String(data[key]);
  });

  const message = {
    token: fcmToken,
    notification: { title, body },
    data: stringifiedData,
    webpush: {
      notification: {
        title,
        body,
        icon: "/icons/Icon-192.png",
      },
      fcmOptions: { link: "/" },
    },
    android: { priority: "high" },
    apns: {
      payload: {
        aps: { sound: "default" },
      },
    },
  };

  try {
    console.log("📲 جاري إرسال الإشعار...");
    const response = await messaging.send(message);
    console.log("✅ تم إرسال الإشعار:", response);
    return response;
  } catch (error) {
    console.error("❌ خطأ فايربيز:", error.code);

    // الرمز مش صالح، امسحه بس من صاحبه المحدد
    if (
      error.code === "messaging/registration-token-not-registered" ||
      error.code === "messaging/invalid-registration-token"
    ) {
      if (ownerId && ownerType) {
        console.log(`🗑️ رمز غير صالح، جاري حذفه من صاحبه (${ownerType})...`);
        await cleanupInvalidTokenForOwner(ownerId, ownerType);
      } else {
        console.log("⚠️ رمز غير صالح، بس ما انبعت صاحب الحساب، ما رح ننظف تلقائياً");
      }
    }

    throw error;
  }
}

// تنظيف الرمز من صاحب الحساب المحدد بس، مش من كل الجداول
async function cleanupInvalidTokenForOwner(ownerId, ownerType) {
  try {
    if (ownerType === "trainer") {
      await Trainer.findByIdAndUpdate(ownerId, { fcmToken: "" });
    } else if (ownerType === "admin") {
      await Admin.findByIdAndUpdate(ownerId, { fcmToken: "" });
    } else if (ownerType === "user") {
      await User.findByIdAndUpdate(ownerId, { fcmToken: "" });
    }
    console.log(`✅ تم مسح الرمز من ${ownerType} رقم ${ownerId}`);
  } catch (err) {
    console.error("❌ خطأ أثناء مسح الرمز:", err);
  }
}

/**
 * إرسال إشعار لعدة أجهزة (مثلاً كل الأدمن)
 * tokensWithOwners: مصفوفة من { token, ownerId, ownerType }
 */
async function sendPushToMultipleTokens(tokensWithOwners, title, body, data = {}) {
  // بيقبل شكلين: مصفوفة رموز بسيطة ["token1", "token2"]
  // أو مصفوفة فيها كل رمز مع صاحبه [{ token, ownerId, ownerType }]
  const normalizedEntries = tokensWithOwners
    .map((entry) => {
      if (typeof entry === 'string') {
        return { token: entry, ownerId: null, ownerType: null };
      }
      return entry;
    })
    .filter(Boolean);

  const validEntries = normalizedEntries.filter((entry) => entry && entry.token);

  if (validEntries.length === 0) {
    console.log("⚠️ لا يوجد رموز صالحة");
    return;
  }

  const stringifiedData = {};
  Object.keys(data).forEach((key) => {
    stringifiedData[key] = String(data[key]);
  });

  const results = [];

  for (const entry of validEntries) {
    try {
      const response = await messaging.send({
        token: entry.token,
        notification: { title, body },
        data: stringifiedData,
        webpush: {
          notification: {
            title,
            body,
            icon: "/icons/Icon-192.png",
          },
          fcmOptions: { link: "/" },
        },
      });

      results.push({ token: entry.token, success: true, response });
    } catch (error) {
      results.push({ token: entry.token, success: false, error: error.message });

      if (
        error.code === "messaging/registration-token-not-registered" ||
        error.code === "messaging/invalid-registration-token"
      ) {
        if (entry.ownerId && entry.ownerType) {
          await cleanupInvalidTokenForOwner(entry.ownerId, entry.ownerType);
        }
      }
    }
  }

  console.log(results);
  return results;
}

module.exports = {
  sendPushToToken,
  sendPushToMultipleTokens,
};