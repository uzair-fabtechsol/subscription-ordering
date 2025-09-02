import { IOtp } from "@/types/otp-types";
import mongoose, { Schema } from "mongoose";
import validator from "validator";
import bcrypt from "bcrypt";

const otpSchema = new Schema<IOtp>(
  {
    firstName: {
      type: String,
      minlength: [2, "First name must be at least 2 characters"],
      maxlength: [50, "First name must be less than 50 characters"],
      trim: true,
      required: true,
    },
    lastName: {
      type: String,
      maxlength: [50, "Last name must be less than 50 characters"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: (value: string) => validator.isEmail(value),
        message: "Please provide a valid email",
      },
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      maxlength: [128, "Password must be less than 128 characters"],
    },
    otp: {
      type: Number,
      default: null,
      validate: {
        validator: (value: number | null) =>
          value === null || /^[0-9]{4}$/.test(String(value)),
        message: "OTP must be a 4-digit number",
      },
    },

    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 10 * 60 * 1000),
    },
    companyName: {
      type: String,
    },
    phoneNumber: {
      type: String,
      validate: {
        validator: (value: string) => validator.isMobilePhone(value),
        message: "Please provide a valid phone number",
      },
    },
    stripeCustomerId: { type: String, default: null },
  },
  {
    timestamps: true,
  }
);

export const OtpModel = mongoose.model<IOtp>("Otp", otpSchema);
