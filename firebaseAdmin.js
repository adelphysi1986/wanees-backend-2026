const { initializeApp, cert } = require("firebase-admin/app");
const { getMessaging } = require("firebase-admin/messaging");

let serviceAccount;

if (process.env.FIREBASE_PRIVATE_KEY) {
    // على الاستضافة (رندر) - بيقرا من متغيرات البيئة
    serviceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    };
} else {
    // على جهازك محليًا - بيقرا من الملف زي ما هو
    serviceAccount = require("./firebase-service-account.json");
}

const app = initializeApp({
    credential: cert(serviceAccount),
});

module.exports = {
    app,
    messaging: getMessaging(app)
};