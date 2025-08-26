import jwt, { SignOptions } from "jsonwebtoken";
import bcrypt from "bcrypt";
import { UserModel } from "@/models/auth-model";
import { NextFunction, Request, Response } from "express";
import { AppError } from "@/utils/AppError";
import { generateOTP } from "@/utils/generate-otp";
import { OtpModel } from "@/models/otp-model";
import { sendMail } from "@/utils/email";
import { IUser } from "@/types/user-types";
import { Types } from "mongoose";

interface CustomRequest extends Request {
  userType: string;
  user: IUser & { _id: Types.ObjectId };
}

// FUNCTION
export const checkAuthUser =
  (allowedUserTypes: string[]) =>
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    try {
      // 1 : take the token out of headers
      const { authorization } = req.headers;
      const token = authorization?.startsWith("Bearer ")
        ? authorization.split(" ")[1]
        : null;

      // 2 : return error if no token exists
      if (!token) {
        return next(
          new AppError("Authorization token is missing or invalid", 401)
        );
      }

      // 3 : decode/verify token
      const decodedToken = jwt.verify(
        token,
        process.env.JWT_SECRET ? process.env.JWT_SECRET : "this_is_wrong_secret"
      ) as { id: string };

      // 4 : get the user id from token
      const userId = decodedToken.id;

      // 5 : get user from DB
      const user = await UserModel.findById(userId);

      if (!user) {
        return next(
          new AppError("The user belonging to this token no longer exists", 401)
        );
      }

      // 6 : check if user's type is in the allowed list
      if (!allowedUserTypes.includes(user.userType)) {
        return next(new AppError("You are not allowed to do this action", 403));
      }

      // 7 : attach user info to request
      req.userType = user.userType as string;
      req.user = user as IUser & { _id: Types.ObjectId };

      next();
    } catch (err: unknown) {
      return next(err);
    }
  };

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
    return res.status(200).json({
      status: "success",
      message: "Otp successfully sent to your email",
    });
  } catch (err: unknown) {
    return next(err);
  }
};

// FUNCTION
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

    let supplier = await UserModel.create({
      firstName,
      lastName: lastName || "",
      email,
      password,
      userType: "supplier",
      companyName,
      phoneNumber,
    });

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
    return res.status(200).json({
      status: "success",
      message: "User fetched successfully",
      data: {
        user,
      },
    });
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

    res.status(200).json({
      status: "success",
      data: {
        user,
        jwt: token,
      },
    });
  } catch (err: unknown) {
    return next(err);
  }
};

// FUNCTION this function sends an otp to email
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

    // 5 : make a document in otp collection
    await OtpModel.create({
      firstName,
      lastName: lastName || "",
      email,
      password,
      otp,
    });

    // 6 : send the response
    return res.status(200).json({
      status: "success",
      message: "Otp successfully sent to your email",
    });
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

    let client = await UserModel.create({
      firstName,
      lastName: lastName || "",
      email,
      password,
      userType: "client",
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

// FUNCTION
export const convertClientToSupplier = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.body.companyName || !req.body.phoneNumber) {
      return next(
        new AppError(
          "companyName and phoneNumber are required to convert client to supplier",
          400
        )
      );
    }

    const newSupplier = await UserModel.findByIdAndUpdate(
      req.user?._id,
      {
        ...req.body,
        userType: "supplier",
        companyName: req.body.companyName,
        phoneNumber: req.body.phoneNumber,
      },
      { new: true, returnDocument: "after", runValidators: true }
    );
    res.status(200).json({
      status: "success",
      message: "Client to supplier conversion success",
      data: {
        newSupplier,
      },
    });
  } catch (err: unknown) {
    return next(err);
  }
};
