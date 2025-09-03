import { ICategory } from "@/types/catagory-types";
import mongoose, { Schema, Document } from "mongoose";

const categorySchema = new Schema<ICategory>(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      trim: true,
    },
    image: {
      type: String, // can store URL or file path
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
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

export const CategoryModel = mongoose.model<ICategory>(
  "Category",
  categorySchema
);
