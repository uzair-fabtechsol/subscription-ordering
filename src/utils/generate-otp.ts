import crypto from "crypto";

export function generateOTP(): string {
  // Generate a random integer between 1000 and 9999
  const otp = crypto.randomInt(1000, 10000);
  return otp.toString();
}
