// src/config/firebase.ts
import admin from "firebase-admin";
import serviceAccount from "./config-json/firebase-service-account.json";

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  projectId: "subscription-ordering-d5b41",
});

console.log("🔥 Firebase Admin initialized successfully!");

export default admin;
