import { Types } from "mongoose";
import { IUser } from "@/types/auth-types";
import { Request } from "express";

export interface CustomRequest extends Request {
  userType: string;
  user: IUser & { _id: Types.ObjectId };
}
