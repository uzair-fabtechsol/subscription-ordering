import admin from "@/firebase";

export const sendNotificationToDevice = async (
  deviceToken: string,
  title: string,
  body: string,
  data: Record<string, string> = {}
) => {
  try {
    const message = {
      notification: { title, body },
      data,
      token: deviceToken,
    };

    const response = await admin.messaging().send(message);
    console.log("✅ Notification sent successfully:", response);
    return response;
  } catch (error) {
    console.error("❌ Error sending notification:", error);
    throw error;
  }
};
