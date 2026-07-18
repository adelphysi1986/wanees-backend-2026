const { initializeApp, cert } = require("firebase-admin/app");
const { getMessaging } = require("firebase-admin/messaging");
const fs = require("fs");

let serviceAccount;

const secretFilePath = "/etc/secrets/firebase-service-account.json";

if (fs.existsSync(secretFilePath)) {
    // على رندر - بيقرا الملف من الـ Secret File مباشرة
    serviceAccount = JSON.parse(fs.readFileSync(secretFilePath, "utf8"));
} else {
    // على جهازك محليًا - بيقرا الملف زي ما كان دايمًا
    serviceAccount = require("./firebase-service-account.json");
}

const app = initializeApp({
    credential: cert(serviceAccount),
});

module.exports = {
    app,
    messaging: getMessaging(app)
};