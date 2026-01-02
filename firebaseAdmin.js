import admin from "firebase-admin";
import serviceAccount from "./firebase-service-account.json" assert { type: "json" };

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

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
