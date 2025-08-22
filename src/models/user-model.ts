import { IUser, UserType } from "@/types/user-types";
import mongoose, { Schema } from "mongoose";
import validator from "validator";

const userSchema = new Schema<IUser>(
  {
    firstName: {
      type: String,
      minlength: [2, "First name must be at least 2 characters"],
      maxlength: [50, "First name must be less than 50 characters"],
      trim: true,
      required: function () {
        return (
          this.userType === UserType.CLIENT ||
          this.userType === UserType.SUPPLIER
        );
      },
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
      validate: {
        validator: (value: string) =>
          validator.isStrongPassword(value, {
            minLength: 6,
            minLowercase: 1,
            minUppercase: 1,
            minNumbers: 1,
            minSymbols: 0,
          }),
        message:
          "Password must contain at least 1 lowercase, 1 uppercase, and 1 number",
      },
    },
    companyName: {
      type: String,
      minlength: [2, "Company name must be at least 2 characters"],
      maxlength: [100, "Company name must be less than 100 characters"],
      required: function () {
        return this.userType === UserType.SUPPLIER;
      },
    },
    phoneNumber: {
      type: String,
      required: function () {
        return this.userType === UserType.SUPPLIER;
      },
      validate: {
        validator: (value: string) => validator.isMobilePhone(value),
        message: "Please provide a valid phone number",
      },
    },
    userType: {
      type: String,
      enum: Object.values(UserType),
      required: [true, "User type is required"],
    },
  },
  {
    timestamps: true,
  }
);

export const UserModel = mongoose.model<IUser>("User", userSchema);
