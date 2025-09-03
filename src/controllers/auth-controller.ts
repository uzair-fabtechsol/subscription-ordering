import jwt, { SignOptions } from "jsonwebtoken";

import crypto from "crypto";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import { UserModel } from "@/models/auth-model";
import { NextFunction, Request, Response } from "express";
import { AppError } from "@/utils/AppError";
import { generateOTP } from "@/utils/generate-otp";
import { OtpModel } from "@/models/otp-model";
import { sendMail, sendResetPasswordMail } from "@/utils/email";
import { UserType } from "@/types/auth-types";
import { CustomRequest } from "@/types/modified-requests-types";
import { IResponseObject } from "@/types/response-object-types";
import mongoose from "mongoose";
import { createStripeCustomer } from "@/utils/stripe-util-hub";
import Stripe from "stripe";
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
const stripe = new Stripe(STRIPE_SECRET_KEY);
dotenv.config();

// DIVIDER Supplier functions

//  this function sends an otp to email
export const signupSupplier = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log(req.body);
    // 1 : take the necessary data out
    const { firstName, lastName, email, companyName, phoneNumber, password } =
      req.body;

    // 2 : check for missing required fields
    if (!firstName || !email || !password || !companyName || !phoneNumber) {
      throw new AppError(
        "Missing required field requiredFields=[firstName, email, password, companyName, phoneNumber ]",
        400
      );
    }

    // 3 : generate an opt
    const otp = generateOTP();

    // 4 : send the otp to email
    const result = await sendMail(email, Number(otp));

    // 5 : if email was not sent successfully throw an error
    if (!result?.success) {
      throw new AppError("Sending otp to email failed", 500);
    }

    // 5 : make a document in otp collection
    await OtpModel.create({
      firstName,
      lastName: lastName || "",
      email,
      password,
      companyName,
      phoneNumber,
      otp,
    });

    // 6 : send the response
    const responseObject: IResponseObject = {
      status: "success",
      message: "Otp successfully sent to your email",
    };
    return res.status(200).json(responseObject);
  } catch (err: unknown) {
    return next(err);
  }
};

export const verifySupplierUsingOtp = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // 1 : take otp out of request body
    let { otp } = req.body;

    // 2 : check if otp exists
    if (!otp) {
      throw new AppError("Otp not provided", 400);
    }

    // 3 : convert the otp into number
    otp = Number(otp);

    // 4 : find the document against the concerned otp
    const otpDoc = await OtpModel.findOne({ otp });

    // 6 : check if otp is expired or invalid
    if (!otpDoc || otpDoc.expiresAt < new Date()) {
      await OtpModel.findByIdAndDelete(otpDoc?._id);
      throw new AppError("OTP invalid or expired", 400);
    }

    // 7 : signup the client, create a document in user collection and send a jwt
    const { firstName, lastName, email, password, companyName, phoneNumber } =
      otpDoc;

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    let supplier = await UserModel.create({
      firstName,
      lastName: lastName || "",
      email,
      password: hashedPassword,
      userType: "supplier",
      companyName,
      phoneNumber,
    });

    console.log("supplier", supplier);

    supplier = supplier.toObject() as any;

    // 8 : preparation for jwt
    const jwtSecret: string = process.env.JWT_SECRET!;
    const jwtExpiresIn: number =
      Number(process.env.JWT_EXPIRES_IN) || 259200000;

    const signOptions: SignOptions = {
      expiresIn: jwtExpiresIn,
    };

    // 9 : sign token
    const token = jwt.sign(
      { id: String(supplier._id) },
      jwtSecret,
      signOptions
    );

    // 1 : once the user is created the otp document should be deleted
    await OtpModel.findByIdAndDelete(otpDoc?._id);

    // 12 : return response

    const responseObject: IResponseObject = {
      status: "success",
      message: "Supplier sign up success",
      data: {
        supplier,
        jwt: token,
      },
    };
    return res.status(200).json(responseObject);
  } catch (err: unknown) {
    return next(err);
  }
};

// DIVIDER Client functions

//  this function sends an otp to email
export const signupClient = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // 1 : take the necessary data out
    const { firstName, lastName, email, password } = req.body;

    // 2 : check for missing required fields
    if (!firstName || !email || !password) {
      throw new AppError(
        "Missing required field requiredFields=[firstName, email, password ]",
        400
      );
    }

    // 3 : write logic to send an otp
    const otp = generateOTP();

    const result = await sendMail(email, Number(otp));

    if (!result?.success) {
      throw new AppError("Sending otp to email failed", 500);
    }
    console.log(otp, "otp-generated");
    // 5 : make a document in otp collection
    await OtpModel.create({
      firstName,
      lastName: lastName || "",
      email,
      password,
      otp,
    });

    // 6 : send the response
    const responseObject: IResponseObject = {
      status: "success",
      message: "Otp successfully sent to your email",
    };
    return res.status(200).json(responseObject);
  } catch (err: unknown) {
    return next(err);
  }
};

// FUNCTION
export const verifyClientUsingOtp = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // 1 : take otp out of request body
    let { otp } = req.body;

    // 2 : check if otp exists
    if (!otp) {
      throw new AppError("Otp not provided", 400);
    }

    // 3 : convert the otp into number
    otp = Number(otp);

    // 4 : find the document against the concerned otp
    const otpDoc = await OtpModel.findOne({ otp });

    // 6 : check if otp is expired or invalid
    if (!otpDoc || otpDoc.expiresAt < new Date()) {
      await OtpModel.findByIdAndDelete(otpDoc?._id);
      throw new AppError("OTP invalid or expired", 400);
    }

    // 7 : signup the client, create a document in user collection and send a jwt
    const { firstName, lastName, email, password } = otpDoc;

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const stripeCustomer = await createStripeCustomer(
      email,
      `${firstName} ${lastName || ""}`.trim(),
      { localUserId: otpDoc._id.toString() }
    );

    // Save Stripe ID back in DB
    // otpDoc.stripeCustomerId = stripeCustomer.id;

    let client = await UserModel.create({
      firstName,
      lastName: lastName || "",
      email,
      password: hashedPassword,
      userType: "client",
      stripeCustomerId: stripeCustomer.id,
    });

    client = client.toObject() as any;

    // 8 : preparation for jwt
    const jwtSecret: string = process.env.JWT_SECRET!;
    const jwtExpiresIn: number =
      Number(process.env.JWT_EXPIRES_IN) || 259200000;

    const signOptions: SignOptions = {
      expiresIn: jwtExpiresIn,
    };

    // 9 : sign token
    const token = jwt.sign({ id: String(client._id) }, jwtSecret, signOptions);

    // 1 : once the user is created the otp document should be deleted
    await OtpModel.findByIdAndDelete(otpDoc?._id);

    // 12 : return response
    const responseObject: IResponseObject = {
      status: "success",
      message: "Supplier sign up success",
      data: {
        client,
        jwt: token,
      },
    };
    return res.status(200).json(responseObject);
  } catch (err: unknown) {
    return next(err);
  }
};

// DIVIDER Admin functions

export const adminSignin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;

    const admin = await UserModel.findOne({ email }).select("+password");

    const passwordCorrect = admin?.password
      ? await bcrypt.compare(password, admin?.password)
      : false;

    // 4 : check both user and passwords are correct or not
    if (!admin || !passwordCorrect) {
      return next(new AppError("Wrong email or password", 401));
    }

    // 6 : sign a jwt, create a jwt
    const jwtSecret: string = process.env.JWT_SECRET!;
    const jwtExpiresIn: number =
      Number(process.env.JWT_EXPIRES_IN) || 259200000;

    const signOptions: SignOptions = {
      expiresIn: jwtExpiresIn,
    };

    const token = jwt.sign(
      { id: String(admin._id) }, // always cast ObjectId to string
      jwtSecret,
      signOptions
    );

    // 7 : send the cookie
    res.cookie("jwt", token, {
      httpOnly: true, // prevents access from JavaScript (XSS protection)
      secure: process.env.NODE_ENV === "production", // only sent over HTTPS in production
      sameSite: "lax", // or "strict" / "none" depending on frontend/backend setup
      path: "/",
      maxAge: 3 * 24 * 60 * 60 * 1000, // in milliseconds
    });

    // send the user to your frontend
    const responseObject: IResponseObject = {
      status: "success",
      message: "Admin sign up success",
      data: {
        admin,
        jwt: token,
      },
    };
    return res.status(200).json(responseObject);
  } catch (err: unknown) {
    return next(err);
  }
};

// DIVIDER Google functions

// FUNCTION
export const sendJwtGoogle = (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = req.user;

    // create your own JWT
    // 8 : preparation for jwt
    const jwtSecret: string = process.env.JWT_SECRET!;
    const jwtExpiresIn: number =
      Number(process.env.JWT_EXPIRES_IN) || 259200000;

    const signOptions: SignOptions = {
      expiresIn: jwtExpiresIn,
    };

    // 9 : sign token
    const token = jwt.sign({ id: String(user._id) }, jwtSecret, signOptions);

    // send the user to your frontend
    const responseObject: IResponseObject = {
      status: "success",
      message: "Supplier sign up success",
      data: {
        user,
        jwt: token,
      },
    };
    return res.status(200).json(responseObject);
  } catch (err: unknown) {
    return next(err);
  }
};

// DIVIDER Common functions

// FUNCTION
export const getCurrSupplierOrCLient = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // 1 : Get the token from Authorization header (format: "Bearer <token>")
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(
        new AppError("Authorization token is missing or invalid", 401)
      );
    }

    // Extract the token string
    const token = authHeader.split(" ")[1];

    if (!token) {
      return next(new AppError("Token is not provided", 401));
    }

    // 2 : verify jwt
    const jwtSecret = process.env.JWT_SECRET as string;

    const decodedToken = jwt.verify(token, jwtSecret) as { id: string };

    // 3 : get the supplier based on id in token
    const userId = decodedToken?.id;

    // 4 : get the user based on id
    const user = await UserModel.findById(userId).select("-password");

    if (!user) {
      return next(new AppError("Supplier does not exists", 401));
    }

    //  : send response
    const responseObject: IResponseObject = {
      status: "success",
      message: "User fetched successfully",
      data: {
        user,
      },
    };
    return res.status(200).json(responseObject);
  } catch (err: unknown) {
    return next(err);
  }
};

// FUNCTION
export const signinSupplierOrClient = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // 1 : check the email and password
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new AppError("email or password missing", 400));
    }

    // 2 : check wether the user exists against that email
    const user = await UserModel.findOne({
      email,
    }).select("+password");

    // 3 : compare the password
    const passwordCorrect = user?.password
      ? await bcrypt.compare(password, user?.password)
      : false;

    // 4 : check both user and passwords are correct or not
    if (!user || !passwordCorrect) {
      return next(new AppError("Wrong email or password", 401));
    }

    // 6 : sign a jwt, create a jwt
    const jwtSecret: string = process.env.JWT_SECRET!;
    const jwtExpiresIn: number =
      Number(process.env.JWT_EXPIRES_IN) || 259200000;

    const signOptions: SignOptions = {
      expiresIn: jwtExpiresIn,
    };

    const token = jwt.sign(
      { id: String(user._id) }, // always cast ObjectId to string
      jwtSecret,
      signOptions
    );

    // 7 : send the cookie
    res.cookie("jwt", token, {
      httpOnly: true, // prevents access from JavaScript (XSS protection)
      secure: process.env.NODE_ENV === "production", // only sent over HTTPS in production
      sameSite: "lax", // or "strict" / "none" depending on frontend/backend setup
      path: "/",
      maxAge: 3 * 24 * 60 * 60 * 1000, // in milliseconds
    });

    const responseObject: IResponseObject = {
      status: "success",
      message: "Sign in successful",
      data: {
        user,
        jwt: token,
      },
    };

    res.status(200).json(responseObject);
  } catch (err: unknown) {
    return next(err);
  }
};

// FUNCTION this sends the reset url to email
export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res
        .status(400)
        .json({ status: "fail", message: "Email is required" });
    }

    const user = await UserModel.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ status: "fail", message: "User not found" });
    }

    // 1. Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // 2. Save hashed token + expiry in DB
    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
    await user.save({ validateBeforeSave: false });

    // 3. Create reset link (frontend route)
    const resetLink = `http://localhost:3000/reset-password?token=${resetToken}&email=${email}`;

    // 4. Send email
    await sendResetPasswordMail(email, resetLink);

    res.status(200).json({
      status: "success",
      message: "Reset password link sent to email",
    });
  } catch (err) {
    next(err);
  }
};

export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { token, newPassword } = req.body;

    // 1. Hash the token because you stored a hashed version in DB
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // 2. Find user with valid token (not expired)
    const user = await UserModel.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ status: "fail", message: "Invalid or expired token" });
    }

    // 3. Update password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    user.password = hashedPassword;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await user.save();

    // 8 : preparation for jwt
    const jwtSecret: string = process.env.JWT_SECRET!;
    const jwtExpiresIn: number =
      Number(process.env.JWT_EXPIRES_IN) || 259200000;

    const signOptions: SignOptions = {
      expiresIn: jwtExpiresIn,
    };

    // 9 : sign token
    const newToken = jwt.sign({ id: String(user._id) }, jwtSecret, signOptions);

    const responseObject: IResponseObject = {
      status: "success",
      message: "Password reset successful",
      data: {
        jwt: newToken,
      },
    };

    return res.status(200).json(responseObject);
  } catch (err) {
    next(err);
  }
};
