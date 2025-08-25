import { OtpModel } from "@/models/otp-model";
import cron from "node-cron";

export const clearOtpCron = () => {
  // Run every 10 minutes
  cron.schedule("*/10 * * * *", async () => {
    try {
      const result = await OtpModel.deleteMany({});
      console.log(`✅ OTPs cleared. Deleted ${result.deletedCount} documents`);
    } catch (err) {
      console.error("❌ Error clearing OTPs:", err);
    }
  });
};
