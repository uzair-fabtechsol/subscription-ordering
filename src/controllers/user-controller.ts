import bcrypt from "bcrypt";
import jwt, { SignOptions } from "jsonwebtoken";
import { UserModel } from "@/models/user-model";
import { NextFunction, Request, Response } from "express";
import { AppError } from "@/utils/AppError";

// FUNCTION
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
      message: "Supplier sign up success",
      data: {
        supplier,
        jwt: token,
      },
    });
  } catch (err: unknown) {
    return next(err);
  }
};

// FUNCTION
export const signinSupplier = async (
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
    const supplier = await UserModel.findOne({
      email,
    }).select("+password");

    // 3 : compare the password
    const passwordCorrect = supplier?.password
      ? await bcrypt.compare(password, supplier?.password)
      : false;

    // 4 : check both supplier and passwords are correct or not
    if (!supplier || !passwordCorrect) {
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
      { id: String(supplier._id) }, // always cast ObjectId to string
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

    res.status(200).json({
      status: "success",
      data: {
        supplier,
        jwt: token,
      },
    });
  } catch (err: unknown) {
    return next(err);
  }
};

// FUNCTION
export const getCurrSupplier = async (
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
    const supplierId = decodedToken?.id;

    // 4 : get the user based on id
    const supplier = await UserModel.findById(supplierId).select("-password");

    if (!supplier) {
      return next(new AppError("Supplier does not exists", 401));
    }

    //  : send response
    return res.status(200).json({
      status: "success",
      message: "User fetched successfully",
      data: {
        supplier,
      },
    });
  } catch (err: unknown) {
    return next(err);
  }
};

// FUNCTION
export const signupClient = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    return res.status(200).json({
      status: "success",
      message: "Client sign up success",
    });
  } catch (err: unknown) {
    return next(err);
  }
};
