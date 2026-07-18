const { initializeApp, cert } = require("firebase-admin/app");
const { getMessaging } = require("firebase-admin/messaging");

let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, "base64").toString("utf8");
    console.log("📏 طول القيمة المستلمة:", process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 ? process.env.FIREBASE_SERVICE_ACCOUNT_BASE64.length : "غير موجودة");
    serviceAccount = JSON.parse(decoded);
} else {
    serviceAccount = require("./firebase-service-account.json");
}

console.log("🔑 Firebase project_id:", serviceAccount.project_id);
console.log("🔑 Firebase client_email:", serviceAccount.client_email);
console.log("🔑 Firebase private_key_id:", serviceAccount.private_key_id);
console.log("🔑 private_key length:", serviceAccount.private_key ? serviceAccount.private_key.length : "MISSING");

const app = initializeApp({
    credential: cert(serviceAccount),
});

module.exports = {
    app,
    messaging: getMessaging(app)
};