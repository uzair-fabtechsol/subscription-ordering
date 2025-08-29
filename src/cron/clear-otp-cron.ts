import { OtpModel } from "@/models/otp-model";
import cron from "node-cron";

export const clearOtpCron = () => {
  // Run every 10 minutes
  cron.schedule("*/10 * * * *", async () => {
    try {
      const now = new Date();

      // Delete only expired OTPs
      const result = await OtpModel.deleteMany({
        expiresAt: { $lte: now },
      });

      console.log(
        `✅ OTP cleanup complete. Deleted ${
          result.deletedCount
        } expired documents at ${now.toISOString()}`
      );
    } catch (err) {
      console.error("❌ Error clearing expired OTPs:", err);
    }
  });
};
