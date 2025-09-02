import { IUser, UserStatus, UserType } from "@/types/auth-types";
import mongoose, { Schema } from "mongoose";
import validator from "validator";

const userSchema = new Schema<IUser>(
  {
    firstName: {
      type: String,
      trim: true,
    },
    lastName: {
      type: String,
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
      minlength: [8, "Password must be at least 6 characters"],
      maxlength: [128, "Password must be less than 128 characters"],
    },
    companyName: {
      type: String,
      required: function () {
        return this.userType === UserType.SUPPLIER;
      },
    },
    phoneNumber: {
      type: String,
      required: function () {
        return this.userType === UserType.SUPPLIER;
      },
    },
    userType: {
      type: String,
      enum: Object.values(UserType),
      required: [true, "User type is required"],
    },
    googleId: {
      type: String,
      default: "",
    },
    avatar: {
      type: String,
    },
    status: {
      type: String,
      enum: Object.values(UserStatus),
      required: [true, "User status is required"],
      default: UserStatus.ACTIVE,
    },
    stripeCustomerId: { type: String, default: null }, // For platform customers
    stripeAccountId: { type: String, default: null },  // For suppliers/sellers
    passwordResetToken: {
      type: String,
      default: null,
    },
    passwordResetExpires: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete (ret as any).password;
        delete (ret as any).__v;
        delete (ret as any).googleId;

        return ret;
      },
    },
  }
);

export const UserModel = mongoose.model<IUser>("User", userSchema);
