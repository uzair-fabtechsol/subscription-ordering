import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import { OrderModel } from "@/models/order-model";
import { ProductModel } from "@/models/product-model";
import { UserModel } from "@/models/auth-model";
import { AppError } from "@/utils/AppError";
import { UserStatus, UserType } from "@/types/auth-types";
import {
  isValidObjectId,
  weekdayFromNumber,
  addDays,
  computeNextDeliveryDate,
  validateUserWithRole,
  validateProduct,
  ensureDeliveryFields,
  computeFirstDeliveryDate
} from "@/utils/helper-functions";
import { IResponseObject } from "@/types/response-object-types";
import Stripe from "stripe";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
const stripe = new Stripe(STRIPE_SECRET_KEY);
// CREATE
export const createOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // 1 : take the necessary fields out
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

    // 2 : check for necessary fields
    if (!product) return next(new AppError("product is required", 400));
    if (!customer) return next(new AppError("customer is required", 400));
    if (!supplier) return next(new AppError("supplier is required", 400));
    if (quantity === undefined)
      return next(new AppError("quantity is required", 400));
    if (price === undefined)
      return next(new AppError("price is required", 400));

    // ensureDeliveryFields(deliveryInterval, deliveryDay);

    // 3 : check if the customer id and supplier id
    if (customer === supplier)
      return next(
        new AppError("customer and supplier cannot be the same user", 400)
      );

    // 4 : validation
    await validateProduct(product); // check if the product (which is id) exists the client is trying to buy
    await validateUserWithRole(customer, UserType.CLIENT, "Customer"); // validate the client who is ordering like status active or not etc
    await validateUserWithRole(supplier, UserType.SUPPLIER, "Supplier"); // same

    let nextDate: Date;
    if (nextDeliveryDate) {
      const nd = new Date(nextDeliveryDate);
      if (isNaN(nd.getTime()))
        return next(new AppError("Invalid nextDeliveryDate", 400));
      nextDate = nd;
    } else {
      nextDate = computeNextDeliveryDate(
        new Date(),
        deliveryDay,
        deliveryInterval
      );
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

    const responseObject: IResponseObject = {
      status: "success",
      message: "",
      data: {
        order: populated,
      },
    };

    return res.status(201).json(responseObject);
  } catch (err) {
    return next(err);
  }
};


// export const createOrder = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     const {
//       product,
//       customer,
//       supplier,
//       quantity,
//       price,
//       deliveryInterval,
//       deliveryDay,
//       currency = "usd",
//     } = req.body;

//     // 1. Create order document in DB
//     const order = await OrderModel.create({
//       product,
//       customer,
//       supplier,
//       quantity,
//       price,
//       deliveryInterval,
//       deliveryDay,
//     });

//     // 2. Fetch customer from DB
//     const customerDoc = await UserModel.findById(customer);
//     if (!customerDoc || !customerDoc.stripeCustomerId) {
//       throw new Error("Customer not connected to Stripe");
//     }

//     let invoice: Stripe.Invoice | null = null;

//     try {
//       // 3. Create invoice
//       invoice = await stripe.invoices.create({
//         customer: customerDoc.stripeCustomerId,
//         auto_advance: true,
//         collection_method: "charge_automatically",
//         metadata: { orderId: (order._id as string).toString() },
//       });

//       // 4. Finalize invoice
//       invoice = await stripe.invoices.finalizeInvoice((invoice.id as string));

//       // 5. Attempt to pay invoice
//       try {
//         invoice = await stripe.invoices.pay((invoice.id as string));
//       } catch (payErr) {
//         console.error("Invoice payment failed:", payErr);
//       }
//     } catch (stripeErr) {
//       console.error("Stripe invoicing error:", stripeErr);
//     }

//     // 6. Calculate delivery dates
//     const firstDelivery = new Date(); // replace with your logic
//     const secondDelivery = new Date(firstDelivery);
//     secondDelivery.setDate(
//       firstDelivery.getDate() + deliveryInterval * 7
//     );

//     // 7. Create subscription for future deliveries
//     let subscription: Stripe.Subscription | null = null;
//     try {
//       const productDoc = await ProductModel.findById(product).select("name");

//       // subscription = await stripe.subscriptions.create({
//       //   customer: customerDoc.stripeCustomerId,
//       //   items: [
//       //     {
//       //       price_data: {
//       //         currency,
//       //         product_data : {
//       //           name: productDoc?.name ?? `Product ${product}`,
//       //           // metadata: { mongoProductId: product.toString() },
//       //         } as any, 
//       //         unit_amount: Math.round(price * 100), // cents
//       //         recurring: {
//       //           interval: "week",
//       //           interval_count: deliveryInterval,
//       //         },
//       //       },
//       //       quantity,
//       //     },
//       //   ],
//       //   billing_cycle_anchor: Math.floor(secondDelivery.getTime() / 1000),
//       //   proration_behavior: "none",
//       //   collection_method: "charge_automatically",
//       //   metadata: { orderId: (order._id as string).toString() },
//       // });


//     } catch (stripeSubErr) {
//       console.error("Stripe subscription creation error:", stripeSubErr);
//     }

//     // 8. Save stripe IDs on order
//     try {
//       await OrderModel.findByIdAndUpdate(
//         order._id,
//         {
//           ...(invoice ? { stripeInvoiceId: invoice.id } : {}),
//           ...(subscription ? { stripeSubscriptionId: subscription.id } : {}),
//         },
//         { new: true }
//       );
//     } catch (updateErr) {
//       console.warn("Could not persist stripe ids on order:", updateErr);
//     }

//     // 9. Populate final response
//     const finalPopulated = await OrderModel.findById(order._id)
//       .populate({ path: "product", select: "name" })
//       .populate({ path: "customer", select: "firstName lastName email" })
//       .populate({ path: "supplier", select: "firstName lastName email" });

//     const responseObject = {
//       status: "success",
//       message: "Order created (invoice/subscription attempted).",
//       data: {
//         order: finalPopulated,
//         invoice: invoice || null,
//         subscription: subscription || null,
//         firstDelivery,
//         secondDelivery,
//       },
//     };

//     return res.status(201).json(responseObject);
//   } catch (err) {
//     return next(err);
//   }
// };

// READ ALL with pagination and filtering


export const getOrders = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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

    if (customer && isValidObjectId(customer))
      filter.customer = new Types.ObjectId(customer);
    if (supplier && isValidObjectId(supplier))
      filter.supplier = new Types.ObjectId(supplier);
    if (product && isValidObjectId(product))
      filter.product = new Types.ObjectId(product);
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
      filter.nextDeliveryDate = {
        ...(filter.nextDeliveryDate || {}),
        $gte: new Date(),
      };
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
      const limitNum = Math.min(
        Math.max(parseInt(limit ?? "10", 10) || 10, 1),
        100
      );
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

      return res
        .status(200)
        .json({ status: "success", results: orders.length, data: orders });
    }
  } catch (err) {
    return next(err);
  }
};

// READ ONE
export const getOrderById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params as { id: string };
    if (!isValidObjectId(id))
      return next(new AppError("Invalid order ID", 400));

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
export const updateOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params as { id: string };
    if (!isValidObjectId(id))
      return next(new AppError("Invalid order ID", 400));

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

    ensureDeliveryFields(
      updates.deliveryInterval as any,
      updates.deliveryDay as any
    );

    if (
      updates.customer &&
      updates.supplier &&
      updates.customer === updates.supplier
    ) {
      return next(
        new AppError("customer and supplier cannot be the same user", 400)
      );
    }

    const existing = await OrderModel.findById(id);
    if (!existing) return next(new AppError("Order not found", 404));

    // Validate entities if ids change
    if (updates.product) await validateProduct(updates.product);
    if (updates.customer)
      await validateUserWithRole(updates.customer, UserType.CLIENT, "Customer");
    if (updates.supplier)
      await validateUserWithRole(
        updates.supplier,
        UserType.SUPPLIER,
        "Supplier"
      );

    // Delivery schedule handling
    let nextDate: Date | undefined;
    const newInterval =
      updates.deliveryInterval ?? (existing.deliveryInterval as any);
    const newDay = updates.deliveryDay ?? (existing.deliveryDay as any);

    if (updates.nextDeliveryDate) {
      const nd = new Date(updates.nextDeliveryDate);
      if (isNaN(nd.getTime()))
        return next(new AppError("Invalid nextDeliveryDate", 400));
      nextDate = nd;
    } else if (
      updates.advanceNext === true ||
      (updates.status && updates.status === "delivered")
    ) {
      // advance schedule from the current nextDeliveryDate
      nextDate = addDays(new Date(existing.nextDeliveryDate), newInterval * 7);
    } else if (
      updates.deliveryInterval !== undefined ||
      updates.deliveryDay !== undefined
    ) {
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
export const deleteOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params as { id: string };
    if (!isValidObjectId(id))
      return next(new AppError("Invalid order ID", 400));

    const order = await OrderModel.findByIdAndDelete(id);
    if (!order) return next(new AppError("Order not found", 404));

    return res
      .status(200)
      .json({ status: "success", message: "Order deleted successfully" });
  } catch (err) {
    return next(err);
  }
};
