const { initializeApp, cert } = require("firebase-admin/app");
const { getMessaging } = require("firebase-admin/messaging");

let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // على رندر - بيقرا كل بيانات الحساب مرة وحدة من متغير بيئة واحد
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else {
    // على جهازك - بيقرا الملف زي ما كان دايمًا
    serviceAccount = require("./firebase-service-account.json");
}

const app = initializeApp({
    credential: cert(serviceAccount),
});

module.exports = {
    app,
    messaging: getMessaging(app)
};