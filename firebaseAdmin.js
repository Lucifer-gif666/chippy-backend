import admin from "firebase-admin";

// 🔐 Load service account from ENV (safe for Render)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(
      JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    ),
  });
}

// 🔔 Send push notification
export const sendPushNotification = async ({ token, title, body, data }) => {
  const message = {
    token,
    notification: {
      title,
      body,
    },
    data: data || {},
  };

  return admin.messaging().send(message);
};
