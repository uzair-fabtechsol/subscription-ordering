import bcrypt from "bcrypt";
import jwt, { SignOptions } from "jsonwebtoken";
import { UserModel } from "@/models/user-model";
import { NextFunction, Request, Response } from "express";
import { AppError } from "@/utils/AppError";

export const signupSupplier = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // 1 : take the necessary data out
    const { firstName, lastName, email, companyName, phoneNumber, password } =
      req.body;

    // 2 : check for missing required fields
    if (!firstName || !email || !companyName || !phoneNumber || !password) {
      throw new AppError(
        "Missing required field requiredFields=[firstName, email, companyName, phoneNumber, password ]",
        400
      );
    }
    // 3 : hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 4 : create supplier
    const supplier = await UserModel.create({
      firstName,
      lastName: lastName || "",
      email,
      companyName,
      phoneNumber,
      password: hashedPassword,
      userType: "supplier",
    });

    // 5 : check if the supplier is created
    if (!supplier) {
      return next(new AppError("Error in creating supplier", 500));
    }

    // 5 : preparation for jwt
    const jwtSecret: string = process.env.JWT_SECRET!;
    const jwtExpiresIn: number =
      Number(process.env.JWT_EXPIRES_IN) || 259200000;

    const signOptions: SignOptions = {
      expiresIn: jwtExpiresIn,
    };

    // 5 : sign token
    const token = jwt.sign(
      { id: String(supplier._id) },
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

    return res.status(200).json({
      status: "success",
      message: "User sign up success",
      data: {
        supplier,
        jwt: token,
      },
    });
  } catch (err: unknown) {
    return next(err);
  }
};
