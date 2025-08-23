import { OtpModel } from "@/models/otp-model";
import { UserModel } from "@/models/user-model";
import { AppError } from "@/utils/AppError";
import { NextFunction, Request, Response } from "express";
import jwt, { SignOptions } from "jsonwebtoken";

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

    const client = await UserModel.create({
      firstName,
      lastName: lastName || "",
      email,
      password,
      userType: "client",
    });

    // 8 : preparation for jwt
    const jwtSecret: string = process.env.JWT_SECRET!;
    const jwtExpiresIn: number =
      Number(process.env.JWT_EXPIRES_IN) || 259200000;

    const signOptions: SignOptions = {
      expiresIn: jwtExpiresIn,
    };

    // 9 : sign token
    const token = jwt.sign({ id: String(client._id) }, jwtSecret, signOptions);

    // 10 : send the cookie
    res.cookie("jwt", token, {
      httpOnly: true, // prevents access from JavaScript (XSS protection)
      secure: process.env.NODE_ENV === "production", // only sent over HTTPS in production
      sameSite: "lax", // or "strict" / "none" depending on frontend/backend setup
      path: "/",
      maxAge: 3 * 24 * 60 * 60 * 1000, // in milliseconds
    });

    // 11 : once the user is created the otp document should be deleted
    await OtpModel.findByIdAndDelete(otpDoc?._id);

    // 12 : return response
    return res.status(200).json({
      status: "success",
      message: "Supplier sign up success",
      data: {
        client,
        jwt: token,
      },
    });
  } catch (err: unknown) {
    return next(err);
  }
};
