import mongoose, { Schema, Document } from "mongoose";

export interface IOrder extends Document {
  product: mongoose.Types.ObjectId;
  customer: mongoose.Types.ObjectId;
  supplier: mongoose.Types.ObjectId;
  quantity: number;
  price: number;
  deliveryInterval: 1 | 2 | 3 | 4;      // every N weeks
  deliveryDay: 1 | 2 | 3 | 4 | 5 | 6 | 7; // 1=Mon, 2=Tue, ..., 7=Sun
  nextDeliveryDate: Date;               // upcoming delivery date
  status: "pending" | "delivered" | "canceled";
}

const orderSchema = new Schema<IOrder>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    customer: { type: Schema.Types.ObjectId, ref: "User", required: true },
    supplier: { type: Schema.Types.ObjectId, ref: "User", required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    deliveryInterval: { type: Number, enum: [1, 2, 3, 4], required: true },
    deliveryDay: { type: Number, enum: [1, 2, 3, 4, 5, 6, 7] },
    nextDeliveryDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ["pending", "delivered", "canceled"],
      default: "pending",
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete (ret as any).__v;
        return ret;
      },
    },
  }
);

export const OrderModel = mongoose.model<IOrder>("Order", orderSchema);
