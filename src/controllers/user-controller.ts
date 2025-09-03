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

// DIVIDER Client Routes

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

// DIVIDER
