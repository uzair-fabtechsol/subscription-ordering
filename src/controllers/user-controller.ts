import bcrypt from "bcrypt";
import dotenv from "dotenv";
import { UserModel } from "@/models/auth-model";
import { NextFunction, Request, Response } from "express";
import { AppError } from "@/utils/AppError";
import { UserType } from "@/types/auth-types";
import { CustomRequest } from "@/types/modified-requests-types";
import { IResponseObject } from "@/types/response-object-types";
import mongoose from "mongoose";
import Stripe from "stripe";

dotenv.config({ quiet: true });

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
const stripe = new Stripe(STRIPE_SECRET_KEY);

// DIVIDER Client route handlers

// (client/customer ONLY) payment method attach
// STEP 1: Create SetupIntent (frontend will use client_secret)
export const createSetupIntent = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId } = req.body;

    const user = await UserModel.findById(userId);
    if (!user || !user.stripeCustomerId) {
      return res
        .status(404)
        .json({ message: "User or Stripe customer not found" });
    }

    const setupIntent = await stripe.setupIntents.create({
      customer: user.stripeCustomerId,
      payment_method_types: ["card"],
    });

    return res.json({ clientSecret: setupIntent.client_secret });
  } catch (err) {
    next(err);
  }
};

// STEP 2: Attach Payment Method after frontend confirms SetupIntent
export const attachPaymentMethod = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId, paymentMethodId } = req.body;

    const user = await UserModel.findById(userId);
    if (!user || !user.stripeCustomerId) {
      return res
        .status(404)
        .json({ message: "User or Stripe customer not found" });
    }

    // Attach payment method to customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: user.stripeCustomerId,
    });

    // Set as default for invoices/subscriptions
    await stripe.customers.update(user.stripeCustomerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    return res.json({ message: "Payment method attached and set as default" });
  } catch (err) {
    next(err);
  }
};

// STEP 3: List payment methods (cards) for a customer
export const listPaymentMethods = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId } = req.body;

    const user = await UserModel.findById(userId);
    if (!user || !user.stripeCustomerId) {
      return res
        .status(404)
        .json({ message: "User or Stripe customer not found" });
    }

    // Fetch all card payment methods for this customer
    const paymentMethods = await stripe.paymentMethods.list({
      customer: user.stripeCustomerId,
      type: "card",
    });

    return res.json({
      paymentMethods: paymentMethods.data,
    });
  } catch (err) {
    next(err);
  }
};


// STEP 4: Remove a payment method
export const removePaymentMethod = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId, paymentMethodId } = req.body;

    const user = await UserModel.findById(userId);
    if (!user || !user.stripeCustomerId) {
      return res
        .status(404)
        .json({ message: "User or Stripe customer not found" });
    }

    // Detach the payment method from the customer
    const detachedPaymentMethod = await stripe.paymentMethods.detach(paymentMethodId);

    return res.json({
      message: "Payment method removed successfully",
      paymentMethod: detachedPaymentMethod,
    });
  } catch (err) {
    next(err);
  }
};


// STEP 5: Set a default payment method
export const setDefaultPaymentMethod = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId, paymentMethodId } = req.body;

    const user = await UserModel.findById(userId);
    if (!user || !user.stripeCustomerId) {
      return res
        .status(404)
        .json({ message: "User or Stripe customer not found" });
    }

    // Update customer's default payment method
    const updatedCustomer = await stripe.customers.update(user.stripeCustomerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    return res.json({
      message: "Default payment method updated successfully",
      customer: updatedCustomer,
    });
  } catch (err) {
    next(err);
  }
};


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

export const getClientPersonalInfo = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Success
    const responseObject: IResponseObject = {
      status: "success",
      message: "Fetch client personal information success",
      data: {
        client: {
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

export const editClientPersonalInfo = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { firstName, lastName } = req.body;

    const dataToUpdate = {
      firstName: firstName,
      lastName: lastName || req.user.lastName || "",
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

// DIVIDER Supplier route handlers

export const getSupplierPersonalInfo = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Success
    const responseObject: IResponseObject = {
      status: "success",
      message: "Fetch supper info success",
      data: {
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        companyName: req.user.companyName,
        phoneNumber: req.user.phoneNumber,
      },
    };

    return res.status(200).json(responseObject);
  } catch (err: unknown) {
    // Edge Case 4: Handle unexpected DB errors
    return next(err);
  }
};

export const editSupplierPersonalInfo = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { firstName, lastName, companyName, phoneNumber } = req.body;

    const dataToUpdate = {
      firstName,
      lastName: lastName || req.user.lastName,
      companyName: companyName || req.user.companyName,
      phoneNumber: phoneNumber || req.user.phoneNumber,
    };

    const updatedSupplier = await UserModel.findByIdAndUpdate(
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
      message: "Update supplier personal information success",
      data: {
        updatedSupplier,
      },
    };

    return res.status(200).json(responseObject);
  } catch (err: unknown) {
    // Edge Case 4: Handle unexpected DB errors
    return next(err);
  }
};

// DIVIDER Admin routes handlers

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
      lastName: lastName || req.user.lastName || "",
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

// DIVIDER Common Route handlers

export const editUserSecurityCredentials = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const id = req.user?._id;

    // fetch the admin
    const admin = await UserModel.findById(id).select("+password");

    // check that the old password is correct
    const passwordCorrect = admin?.password
      ? await bcrypt.compare(oldPassword, admin?.password)
      : false;

    if (!passwordCorrect) {
      throw new AppError("Old password not correct", 400);
    }

    // hash the new password and update
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // update the admin
    await UserModel.findByIdAndUpdate(id, { password: hashedPassword });

    // Success
    const responseObject: IResponseObject = {
      status: "success",
      message: "Security credentials updated",
    };

    return res.status(200).json(responseObject);
  } catch (err: unknown) {
    // Edge Case 4: Handle unexpected DB errors
    return next(err);
  }
};
