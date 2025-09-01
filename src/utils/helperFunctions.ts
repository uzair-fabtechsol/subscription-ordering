import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import { OrderModel } from "@/models/order-model";
import { ProductModel } from "@/models/product-model";
import { UserModel } from "@/models/auth-model";
import { AppError } from "@/utils/AppError";
import { UserStatus, UserType } from "@/types/auth-types";

 const isValidObjectId = (id?: string) => !!id && Types.ObjectId.isValid(id);

const weekdayFromNumber = (n: number) => {
  // order-model: 1=Mon ... 7=Sun ; JS getDay(): 0=Sun ... 6=Sat
  return n === 7 ? 0 : n; // convert to JS weekday for comparison ONLY
};

const addDays = (date: Date, days: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const computeNextDeliveryDate = (from: Date, deliveryDay: number, interval: number) => {
  // from: reference date (usually now)
  // deliveryDay: 1..7 (Mon..Sun)
  // interval: weeks (1..4)
  const jsTarget = weekdayFromNumber(deliveryDay);
  const base = new Date(from);
  base.setHours(0, 0, 0, 0);

  const jsCurrent = base.getDay(); // 0..6
  // distance to next target day this week
  let delta = jsTarget - jsCurrent;
  if (delta <= 0) delta += 7; // ensure future day in current cycle

  // the next occurrence of target weekday
  const firstOccurrence = addDays(base, delta);

  // apply interval (N weeks). If interval is 1, no extra weeks added.
  const result = addDays(firstOccurrence, (interval - 1) * 7);
  return result;
};

const validateUserWithRole = async (userId: string, role: UserType, label: string) => {
  if (!isValidObjectId(userId)) throw new AppError(`Invalid ${label} ID`, 400);
  const user = await UserModel.findById(userId).select("userType status firstName lastName email");
  if (!user) throw new AppError(`${label} not found`, 404);
  if (user.userType !== role) throw new AppError(`${label} must be a ${role}`, 400);
  if (user.status !== UserStatus.ACTIVE) throw new AppError(`${label} is not active`, 400);
  return user;
};

const validateProduct = async (productId: string) => {
  if (!isValidObjectId(productId)) throw new AppError("Invalid product ID", 400);
  const product = await ProductModel.findById(productId).select("name price status");
  if (!product) throw new AppError("Product not found", 404);
  return product;
};

const ensureDeliveryFields = (deliveryInterval?: number, deliveryDay?: number) => {
  const allowedIntervals = [1, 2, 3, 4];
  const allowedDays = [1, 2, 3, 4, 5, 6, 7];
  if (deliveryInterval !== undefined && !allowedIntervals.includes(deliveryInterval))
    throw new AppError("Invalid deliveryInterval. Allowed: 1,2,3,4", 400);
  if (deliveryDay !== undefined && !allowedDays.includes(deliveryDay))
    throw new AppError("Invalid deliveryDay. Allowed: 1..7 (Mon..Sun)", 400);
};

export {
  isValidObjectId,
  weekdayFromNumber,
  addDays,
  computeNextDeliveryDate,
  validateUserWithRole,
  validateProduct,
  ensureDeliveryFields
}