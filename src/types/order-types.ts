import mongoose, { Document } from "mongoose";

export interface IOrder extends Document {
  product: mongoose.Types.ObjectId;
  customer: mongoose.Types.ObjectId;
  supplier: mongoose.Types.ObjectId;
  quantity: number;
  price: number;
  deliveryInterval: 1 | 2 | 3 | 4; // every N weeks
  deliveryDay: 1 | 2 | 3 | 4 | 5 | 6 | 7; // 1=Mon, 2=Tue, ..., 7=Sun
  nextDeliveryDate: Date; // upcoming delivery date
  status: "pending" | "delivered" | "canceled";
}
