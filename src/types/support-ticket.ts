import { Document, Types } from "mongoose";
import { IUser } from "./auth-types"; // adjust path to your user type

export interface ISupportTicket extends Document {
  name: string;
  subject?: string;
  message: string;
  status: "rejected" | "resolved" | "pending";
  user: IUser;
  adminResponse: string;
  attachments: {
    url: string;
    type: string;
    name: string;
  }[];
}