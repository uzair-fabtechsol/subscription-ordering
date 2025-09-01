import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import { OrderModel } from "@/models/order-model";
import { ProductModel } from "@/models/product-model";
import { UserModel } from "@/models/auth-model";
import { AppError } from "@/utils/AppError";
import { UserStatus, UserType } from "@/types/auth-types";
import {isValidObjectId,weekdayFromNumber,addDays,computeNextDeliveryDate,validateUserWithRole,validateProduct,ensureDeliveryFields} from '@/utils/helperFunctions';

// CREATE
export const createOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      product,
      customer,
      supplier,
      quantity,
      price,
      deliveryInterval,
      deliveryDay,
      nextDeliveryDate,
      status,
    } = req.body as {
      product: string;
      customer: string;
      supplier: string;
      quantity: number;
      price: number;
      deliveryInterval: 1 | 2 | 3 | 4;
      deliveryDay: 1 | 2 | 3 | 4 | 5 | 6 | 7;
      nextDeliveryDate?: string | Date;
      status?: "pending" | "delivered" | "canceled";
    };

    if (!product) return next(new AppError("product is required", 400));
    if (!customer) return next(new AppError("customer is required", 400));
    if (!supplier) return next(new AppError("supplier is required", 400));
    if (quantity === undefined) return next(new AppError("quantity is required", 400));
    if (price === undefined) return next(new AppError("price is required", 400));

    ensureDeliveryFields(deliveryInterval, deliveryDay);

    if (customer === supplier) return next(new AppError("customer and supplier cannot be the same user", 400));

    await validateProduct(product);
    await validateUserWithRole(customer, UserType.CLIENT, "Customer");
    await validateUserWithRole(supplier, UserType.SUPPLIER, "Supplier");

    let nextDate: Date;
    if (nextDeliveryDate) {
      const nd = new Date(nextDeliveryDate);
      if (isNaN(nd.getTime())) return next(new AppError("Invalid nextDeliveryDate", 400));
      nextDate = nd;
    } else {
      nextDate = computeNextDeliveryDate(new Date(), deliveryDay, deliveryInterval);
    }

    const order = await OrderModel.create({
      product,
      customer,
      supplier,
      quantity,
      price,
      deliveryInterval,
      deliveryDay,
      nextDeliveryDate: nextDate,
      status: status ?? "pending",
    });

    const populated = await OrderModel.findById(order._id)
      .populate({ path: "product", select: "name" })
      .populate({ path: "customer", select: "firstName lastName email" })
      .populate({ path: "supplier", select: "firstName lastName email" });

    return res.status(201).json({ status: "success", data: populated });
  } catch (err) {
    return next(err);
  }
};

// READ ALL with pagination and filtering
export const getOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      page,
      limit,
      customer,
      supplier,
      product,
      status,
      minPrice,
      maxPrice,
      minQty,
      maxQty,
      nextFrom,
      nextTo,
      createdFrom,
      createdTo,
      sort,
      upcoming,
    } = req.query as Record<string, string | undefined>;

    const filter: Record<string, any> = {};

    if (customer && isValidObjectId(customer)) filter.customer = new Types.ObjectId(customer);
    if (supplier && isValidObjectId(supplier)) filter.supplier = new Types.ObjectId(supplier);
    if (product && isValidObjectId(product)) filter.product = new Types.ObjectId(product);
    if (status) filter.status = status;

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    if (minQty || maxQty) {
      filter.quantity = {};
      if (minQty) filter.quantity.$gte = Number(minQty);
      if (maxQty) filter.quantity.$lte = Number(maxQty);
    }

    if (nextFrom || nextTo) {
      filter.nextDeliveryDate = {};
      if (nextFrom) filter.nextDeliveryDate.$gte = new Date(nextFrom);
      if (nextTo) filter.nextDeliveryDate.$lte = new Date(nextTo);
    }

    if (createdFrom || createdTo) {
      filter.createdAt = {};
      if (createdFrom) filter.createdAt.$gte = new Date(createdFrom);
      if (createdTo) filter.createdAt.$lte = new Date(createdTo);
    }

    if (upcoming === "true") {
      filter.nextDeliveryDate = { ...(filter.nextDeliveryDate || {}), $gte: new Date() };
    }

    // Sorting
    let sortObj: Record<string, 1 | -1> = { createdAt: -1 };
    if (sort) {
      // sort format: field:asc|desc, e.g., createdAt:desc or nextDeliveryDate:asc
      const [field, dir] = sort.split(":");
      if (field) sortObj = { [field]: dir === "asc" ? 1 : -1 } as any;
    }

    const hasPagination = page !== undefined || limit !== undefined;

    if (hasPagination) {
      const pageNum = Math.max(parseInt(page ?? "1", 10) || 1, 1);
      const limitNum = Math.min(Math.max(parseInt(limit ?? "10", 10) || 10, 1), 100);
      const skip = (pageNum - 1) * limitNum;

      const [orders, total] = await Promise.all([
        OrderModel.find(filter)
          .sort(sortObj)
          .skip(skip)
          .limit(limitNum)
          .select(
            "product customer supplier quantity price deliveryInterval deliveryDay nextDeliveryDate status createdAt"
          )
          .populate({ path: "product", select: "name" })
          .populate({ path: "customer", select: "firstName lastName email" })
          .populate({ path: "supplier", select: "firstName lastName email" })
          .lean(),
        OrderModel.countDocuments(filter),
      ]);

      return res.status(200).json({
        status: "success",
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        results: orders.length,
        data: orders,
      });
    } else {
      const orders = await OrderModel.find(filter)
        .sort(sortObj)
        .select(
          "product customer supplier quantity price deliveryInterval deliveryDay nextDeliveryDate status createdAt"
        )
        .populate({ path: "product", select: "name" })
        .populate({ path: "customer", select: "firstName lastName email" })
        .populate({ path: "supplier", select: "firstName lastName email" })
        .lean();

      return res.status(200).json({ status: "success", results: orders.length, data: orders });
    }
  } catch (err) {
    return next(err);
  }
};

// READ ONE
export const getOrderById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as { id: string };
    if (!isValidObjectId(id)) return next(new AppError("Invalid order ID", 400));

    const order = await OrderModel.findById(id)
      .select(
        "product customer supplier quantity price deliveryInterval deliveryDay nextDeliveryDate status createdAt updatedAt"
      )
      .populate({ path: "product", select: "name" })
      .populate({ path: "customer", select: "firstName lastName email" })
      .populate({ path: "supplier", select: "firstName lastName email" });

    if (!order) return next(new AppError("Order not found", 404));
    return res.status(200).json({ status: "success", data: order });
  } catch (err) {
    return next(err);
  }
};

// UPDATE
export const updateOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as { id: string };
    if (!isValidObjectId(id)) return next(new AppError("Invalid order ID", 400));

    const updates = req.body as Partial<{
      product: string;
      customer: string;
      supplier: string;
      quantity: number;
      price: number;
      deliveryInterval: 1 | 2 | 3 | 4;
      deliveryDay: 1 | 2 | 3 | 4 | 5 | 6 | 7;
      nextDeliveryDate: string | Date;
      status: "pending" | "delivered" | "canceled";
      advanceNext?: boolean;
    }>;

    ensureDeliveryFields(updates.deliveryInterval as any, updates.deliveryDay as any);

    if (updates.customer && updates.supplier && updates.customer === updates.supplier) {
      return next(new AppError("customer and supplier cannot be the same user", 400));
    }

    const existing = await OrderModel.findById(id);
    if (!existing) return next(new AppError("Order not found", 404));

    // Validate entities if ids change
    if (updates.product) await validateProduct(updates.product);
    if (updates.customer) await validateUserWithRole(updates.customer, UserType.CLIENT, "Customer");
    if (updates.supplier) await validateUserWithRole(updates.supplier, UserType.SUPPLIER, "Supplier");

    // Delivery schedule handling
    let nextDate: Date | undefined;
    const newInterval = updates.deliveryInterval ?? (existing.deliveryInterval as any);
    const newDay = updates.deliveryDay ?? (existing.deliveryDay as any);

    if (updates.nextDeliveryDate) {
      const nd = new Date(updates.nextDeliveryDate);
      if (isNaN(nd.getTime())) return next(new AppError("Invalid nextDeliveryDate", 400));
      nextDate = nd;
    } else if (updates.advanceNext === true || (updates.status && updates.status === "delivered")) {
      // advance schedule from the current nextDeliveryDate
      nextDate = addDays(new Date(existing.nextDeliveryDate), newInterval * 7);
    } else if (updates.deliveryInterval !== undefined || updates.deliveryDay !== undefined) {
      // recalc based on now if scheduling parameters changed
      nextDate = computeNextDeliveryDate(new Date(), newDay, newInterval);
    }

    const payload: any = { ...updates };
    if (nextDate) payload.nextDeliveryDate = nextDate;

    const order = await OrderModel.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    })
      .select(
        "product customer supplier quantity price deliveryInterval deliveryDay nextDeliveryDate status createdAt updatedAt"
      )
      .populate({ path: "product", select: "name" })
      .populate({ path: "customer", select: "firstName lastName email" })
      .populate({ path: "supplier", select: "firstName lastName email" });

    return res.status(200).json({ status: "success", data: order });
  } catch (err) {
    return next(err);
  }
};

// DELETE
export const deleteOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as { id: string };
    if (!isValidObjectId(id)) return next(new AppError("Invalid order ID", 400));

    const order = await OrderModel.findByIdAndDelete(id);
    if (!order) return next(new AppError("Order not found", 404));

    return res.status(200).json({ status: "success", message: "Order deleted successfully" });
  } catch (err) {
    return next(err);
  }
};
