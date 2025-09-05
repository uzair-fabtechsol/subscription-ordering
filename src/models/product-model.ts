import { IProduct } from "@/types/product-types";
import mongoose, { Schema, Document } from "mongoose";

const productSchema = new Schema<IProduct>(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
    },
    supplierId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Supplier id is required"],
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Product category is required"],
    },
    images: [
      {
        type: String, // Store image URLs or file paths
        trim: true,
      },
    ],
    stock: {
      type: Number,
      required: [true, "Stock quantity is required"],
      min: [0, "Stock cannot be negative"],
    },
    description: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    discount: {
      type: Number,
      default: 0,
      min: [0, "Discount cannot be negative"],
      max: [100, "Discount cannot exceed 100%"],
    },
    profit: {
      type: Number,
      default: 0,
      min: [0, "Profit cannot be negative"],
    },
    status: {
      type: String,
      enum: ["in_stock", "out_of_stock"],
      default: "active",
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

export const ProductModel = mongoose.model<IProduct>("Product", productSchema);
