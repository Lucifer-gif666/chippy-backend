import admin from "firebase-admin";

// 🔐 Load service account from ENV (safe for Render)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(
      JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    ),
  });
}

// 🔔 Send push notification with enhanced error handling
export const sendPushNotification = async ({ token, title, body, data }) => {
  try {
    // Validate token format
    if (!token || typeof token !== 'string' || token.length < 100) {
      console.error('Invalid FCM token:', token);
      throw new Error('Invalid FCM token format');
    }

    const message = {
      token,
      notification: { title, body },
      android: {
        priority: "high",
        notification: {
          sound: "default",
          channelId: "chippy-alerts",
          clickAction: "FLUTTER_NOTIFICATION_CLICK",
        },
        ttl: 86400, // 24 hours
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
            badge: 1,
            alert: { title, body },
          },
        },
      },
      data: data || {},
    };

    console.log('Sending push notification:', {
      token: token.substring(0, 20) + '...',
      title,
      body,
      data
    });

    const result = await admin.messaging().send(message);
    console.log('Push notification sent successfully:', result);
    return result;
  } catch (error) {
    console.error('Push notification failed:', {
      error: error.message,
      code: error.code,
      token: token ? token.substring(0, 20) + '...' : 'undefined',
      title,
      body
    });

    // Handle specific FCM errors
    if (error.code === 'messaging/registration-token-not-registered') {
      console.error('FCM token not registered - token may be expired');
      // You might want to remove this token from the database
    } else if (error.code === 'messaging/invalid-registration-token') {
      console.error('Invalid FCM token format');
    } else if (error.code === 'messaging/server-unavailable') {
      console.error('FCM server unavailable - retry later');
    }

    throw error;
  }
};
  