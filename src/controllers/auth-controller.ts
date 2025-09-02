import jwt, { SignOptions } from "jsonwebtoken";
import bcrypt from "bcrypt";
import { UserModel } from "@/models/auth-model";
import { NextFunction, Request, Response } from "express";
import { AppError } from "@/utils/AppError";
import { generateOTP } from "@/utils/generate-otp";
import { OtpModel } from "@/models/otp-model";
import { sendMail } from "@/utils/email";
import { UserType } from "@/types/auth-types";

import dotenv from "dotenv";
import { CustomRequest } from "@/types/modified-requests-types";
import { IResponseObject } from "@/types/response-object-types";
import mongoose from "mongoose";
dotenv.config();

// DIVIDER Supplier functions

// FUNCTION this function sends an otp to email
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

    let client = await UserModel.create({
      firstName,
      lastName: lastName || "",
      email,
      password: hashedPassword,
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

export const getAllSuppliers = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // 1: Prepare the base query object from query params
    let queryObj = { ...req.query };

    // 2: Exclude pagination, search and other special fields
    const excludedFields = ["page", "sort", "limit", "fields", "search"];
    excludedFields.forEach((val) => delete queryObj[val]);

    // 3: Always include userType as supplier in the base query
    queryObj = { ...queryObj, userType: "supplier" };

    // 4: Handle search functionality on firstName
    if (req.query?.search) {
      const searchTerm = req.query.search as string;
      if (searchTerm.trim().length > 0) {
        queryObj.firstName = {
          $regex: searchTerm,
          $options: "i", // case-insensitive
        };
      }
    }

    // 5: Create the base query with filters and search
    let query = UserModel.find(queryObj);

    // 6: Handle sorting
    if (req.query?.sort) {
      const sortBy = (req.query.sort as string).split(",").join(" ");
      query = query.sort(sortBy);
    } else {
      query = query.sort("-createdAt"); // Default sort
    }

    // 7: Handle field selection
    if (req.query?.fields) {
      const fields = (req.query.fields as string).split(",").join(" ");
      query = query.select(fields);
    }

    // 8: Get total count
    const totalResults = await UserModel.countDocuments(queryObj);

    // 9: Pagination params (with validation)
    const page = req?.query?.page ? Number(req.query?.page) : 1;
    const limit = req?.query?.limit ? Number(req.query?.limit) : 10;

    if (isNaN(page) || page <= 0) {
      throw new AppError(
        "Invalid 'page' value, must be a positive number",
        400
      );
    }
    if (isNaN(limit) || limit <= 0) {
      throw new AppError(
        "Invalid 'limit' value, must be a positive number",
        400
      );
    }

    const skip = (page - 1) * limit;

    // 10: Validate page exists
    if (req.query?.page && skip >= totalResults && totalResults > 0) {
      throw new AppError("This page doesn't exist", 404);
    }

    // 11: Apply pagination
    query = query.skip(skip).limit(limit);

    // 12: Execute query
    const suppliers = await query;

    // 13: Handle no suppliers found
    if (!suppliers || suppliers.length === 0) {
      return res.status(200).json({
        status: "success",
        message: "No suppliers found matching criteria",
        data: {
          suppliers: [],
          totalResults: 0,
        },
      });
    }

    const responseObject: IResponseObject = {
      status: "success",
      message: "Fetching all suppliers success",
      data: {
        suppliers,
        totalResults,
        pagination: {
          currentPage: page,
          limit,
          totalPages: Math.ceil(totalResults / limit),
        },
      },
    };

    return res.status(200).json(responseObject);
  } catch (err: unknown) {
    return next(err);
  }
};

export const getSupplierOnId = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    if (!id) {
      throw new AppError("Id is missing", 400);
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError("Invalid id format", 400);
    }

    const supplier = await UserModel.findOne({
      _id: id,
      userType: UserType.SUPPLIER,
    });

    if (!supplier) {
      throw new AppError("Supplier not found", 404);
    }

    const responseObject: IResponseObject = {
      status: "success",
      message: "Fetching supplier on id success",
      data: { supplier },
    };

    return res.status(200).json(responseObject);
  } catch (err: unknown) {
    return next(err);
  }
};

export const updateSupplierOnId = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    if (!id) {
      throw new AppError("Id is missing", 400);
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError("Invalid supplier id format", 400);
    }

    if (!req.body.status) {
      throw new AppError("Status field is required", 400);
    }

    const updates = { status: req.body.status };

    const updatedSupplier = await UserModel.findOneAndUpdate(
      { _id: id, userType: UserType.SUPPLIER },
      updates,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedSupplier) {
      throw new AppError("Supplier not found", 404);
    }

    const responseObject: IResponseObject = {
      status: "success",
      message: "Updating supplier on id success",
      data: { updatedSupplier },
    };

    return res.status(200).json(responseObject);
  } catch (err: unknown) {
    return next(err);
  }
};

export const deleteSupplierOnId = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    if (!id) {
      throw new AppError("Id is missing", 400);
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError("Invalid supplier id format", 400);
    }

    const deletedSupplier = await UserModel.findOneAndDelete({
      _id: id,
      userType: UserType.SUPPLIER,
    });

    if (!deletedSupplier) {
      throw new AppError("Supplier not found", 404);
    }

    const responseObject: IResponseObject = {
      status: "success",
      message: "Deleting supplier on id success",
    };

    return res.status(200).json(responseObject);
  } catch (err: unknown) {
    return next(err);
  }
};

export const getAllClients = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // 1: Prepare the base query object from query params
    let queryObj = { ...req.query };

    // 2: Exclude pagination, search and other special fields
    const excludedFields = ["page", "sort", "limit", "fields", "search"];
    excludedFields.forEach((val) => delete queryObj[val]);

    // 3: Always include userType as client in the base query
    queryObj = { ...queryObj, userType: "client" };

    // 4: Handle search functionality on firstName
    if (req.query?.search) {
      const searchTerm = req.query.search as string;

      if (searchTerm.trim().length < 2) {
        throw new AppError(
          "Search term must be at least 2 characters long",
          400
        );
      }

      queryObj.firstName = {
        $regex: searchTerm,
        $options: "i", // case-insensitive
      };
    }

    // 5: Create the base query
    let query = UserModel.find(queryObj);

    // 6: Handle sorting if specified
    if (req.query?.sort) {
      const sortBy = (req.query.sort as string).split(",").join(" ");
      query = query.sort(sortBy);
    } else {
      // Default sort by creation date (newest first)
      query = query.sort("-createdAt");
    }

    // 7: Handle field selection if specified
    if (req.query?.fields) {
      const fields = (req.query.fields as string).split(",").join(" ");
      query = query.select(fields);
    }

    // 8: Get total count of filtered/searched clients
    const totalResults = await UserModel.countDocuments(queryObj);

    // 9: Apply pagination
    const page = req?.query?.page ? Number(req.query?.page) : 1;
    const limit = req?.query?.limit ? Number(req.query?.limit) : 10;

    if (isNaN(page) || page <= 0) {
      throw new AppError("Page number must be a positive integer", 400);
    }
    if (isNaN(limit) || limit <= 0) {
      throw new AppError("Limit must be a positive integer", 400);
    }

    const skip = (page - 1) * limit;

    // 10: Validate page exists (only if page is specified)
    if (req.query?.page && skip >= totalResults) {
      throw new AppError("This page doesn't exist", 404);
    }

    // 11: Apply pagination to the query
    query = query.skip(skip).limit(limit);

    // 12: Execute the query
    const clients = await query;

    // 13: Handle case where no clients found
    if (!clients || clients.length === 0) {
      return res.status(200).json({
        status: "success",
        message: "No clients found for the given filters",
        data: {
          clients: [],
          totalResults,
        },
      });
    }

    const responseObject: IResponseObject = {
      status: "success",
      message: "Fetching all clients success",
      data: {
        clients,
        totalResults,
        currentPage: page,
        totalPages: Math.ceil(totalResults / limit),
      },
    };

    return res.status(200).json(responseObject);
  } catch (err: unknown) {
    return next(err);
  }
};

export const getClientOnId = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    // 1: Validate ID is provided
    if (!id) {
      throw new AppError("Client ID is required", 400);
    }

    // 2: Validate if ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError("Invalid client ID format", 400);
    }

    // 3: Search for client by ID and type
    const client = await UserModel.findOne({
      _id: id,
      userType: UserType.CLIENT,
    });

    // 4: Handle case where client not found
    if (!client) {
      throw new AppError("Client not found", 404);
    }

    // 5: Success response
    const responseObject: IResponseObject = {
      status: "success",
      message: "Client fetched successfully",
      data: {
        client,
      },
    };

    return res.status(200).json(responseObject);
  } catch (err: unknown) {
    return next(err);
  }
};

export const updateClientOnId = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    // 1: Validate ID exists
    if (!id) {
      throw new AppError("Client ID is required", 400);
    }

    // 2: Validate ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError("Invalid client ID format", 400);
    }

    // 3: Ensure body contains updates
    if (!req.body || Object.keys(req.body).length === 0) {
      throw new AppError("No update data provided", 400);
    }

    // 4: Whitelist allowed updates (only "status" for now)
    const allowedUpdates = ["status"];
    const updates: Record<string, any> = {};
    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      throw new AppError("Invalid or missing fields to update", 400);
    }

    // 5: Update client
    const updatedClient = await UserModel.findOneAndUpdate(
      { _id: id, userType: UserType.CLIENT },
      updates,
      {
        new: true,
        runValidators: true,
      }
    );

    // 6: Handle not found case
    if (!updatedClient) {
      throw new AppError("Client not found", 404);
    }

    // 7: Success response
    const responseObject: IResponseObject = {
      status: "success",
      message: "Client updated successfully",
      data: {
        updatedClient,
      },
    };

    return res.status(200).json(responseObject);
  } catch (err: unknown) {
    return next(err);
  }
};

export const deleteClientOnId = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    // Edge Case 1: Missing ID
    if (!id) {
      throw new AppError("Id is missing", 400);
    }

    // Edge Case 2: Invalid ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError("Invalid client ID format", 400);
    }

    // Try to delete client
    const deletedClient = await UserModel.findOneAndDelete({
      _id: id,
      userType: UserType.CLIENT,
    });

    // Edge Case 3: Client not found
    if (!deletedClient) {
      throw new AppError("Client not found", 404);
    }

    // Success
    const responseObject: IResponseObject = {
      status: "success",
      message: "Deleting client on id success",
      data: {
        deletedClient, // optional: return deleted client info
      },
    };

    return res.status(200).json(responseObject);
  } catch (err: unknown) {
    // Edge Case 4: Handle unexpected DB errors
    return next(err);
  }
};

export const getAdminPersonalInfo = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Success
    const responseObject: IResponseObject = {
      status: "success",
      message: "Fetch admin personal information success",
      data: {
        admin: {
          firstName: req.user?.firstName,
          lastName: req.user?.lastName,
        },
      },
    };

    return res.status(200).json(responseObject);
  } catch (err: unknown) {
    // Edge Case 4: Handle unexpected DB errors
    return next(err);
  }
};

export const editAdminPersonalInfo = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { firstName, lastName } = req.body;

    const dataToUpdate = {
      firstName: firstName,
      lastName: lastName || "",
    };

    const updatedAdmin = await UserModel.findByIdAndUpdate(
      req.user?._id,
      dataToUpdate,
      {
        new: true,
        runValidators: true,
      }
    );
    // Success
    const responseObject: IResponseObject = {
      status: "success",
      message: "Update admin personal information success",
      data: {
        updatedAdmin,
      },
    };

    return res.status(200).json(responseObject);
  } catch (err: unknown) {
    // Edge Case 4: Handle unexpected DB errors
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

    const responseObject: IResponseObject = {
      status: "success",
      message: "Client to supplier conversion success",
      data: {
        newSupplier,
      },
    };
    res.status(200).json(responseObject);
  } catch (err: unknown) {
    return next(err);
  }
};
