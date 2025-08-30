"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearOtpCron = void 0;
const otp_model_1 = require("../models/otp-model");
const node_cron_1 = __importDefault(require("node-cron"));
const clearOtpCron = () => {
    // Run every 10 minutes
    node_cron_1.default.schedule("*/10 * * * *", async () => {
        try {
            const now = new Date();
            // Delete only expired OTPs
            const result = await otp_model_1.OtpModel.deleteMany({
                expiresAt: { $lte: now },
            });
            console.log(`✅ OTP cleanup complete. Deleted ${result.deletedCount} expired documents at ${now.toISOString()}`);
        }
        catch (err) {
            console.error("❌ Error clearing expired OTPs:", err);
        }
    });
};
exports.clearOtpCron = clearOtpCron;
