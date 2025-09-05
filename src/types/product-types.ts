import mongoose, { Document } from "mongoose";

export interface IProduct extends Document {
  name: string;
  supplierId: mongoose.Types.ObjectId;
  category: mongoose.Types.ObjectId; // Reference to Category
  images: string[];
  stock: number;
  description?: string;
  price: number;
  discount?: number;
  profit?: number;
  status: "active" | "inactive";
}
