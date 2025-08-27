import { IUser, UserType } from "@/types/auth-types";
import mongoose, { Schema } from "mongoose";
import validator from "validator";
import bcrypt from "bcrypt";

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
    googleId: {
      type: String,
      unique: true,
    },
    avatar: {
      type: String,
      validate: {
        validator: (value: string) => !value || validator.isURL(value),
        message: "Please provide a valid URL for the avatar",
      },
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete (ret as any).password;
        delete (ret as any).__v;
        return ret;
      },
    },
  }
);

userSchema.pre("save", async function (next) {
  // Only hash if password is modified (important for updates!)
  if (!this.isModified("password")) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);

  next();
});

export const UserModel = mongoose.model<IUser>("User", userSchema);
