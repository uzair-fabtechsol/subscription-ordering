import { Document, Types } from "mongoose";
import { IUser } from "./auth-types";

export interface IProductReview extends Document {
    user: IUser| Types.ObjectId;
    product: Types.ObjectId;
    rating: number;
    comment: string;
 
}