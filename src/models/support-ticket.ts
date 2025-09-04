import { ISupportTicket } from "@/types/support-ticket";
import mongoose, { Schema, Document } from "mongoose";


const userSchema = new Schema<ISupportTicket>(
{
      name: {
      type: String,
      trim: true,
    },
    subject: {
      type: String,
      trim: true,
    },
    message: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "resolved", "rejected"],
      default: "pending",
    },
   user:{
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
      attachments: [
      {
        url: {
          type: String,
          required: true,
        },
        type: {
          type: String,
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
      },
    ],
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

export const SupportTicketModel = mongoose.model<ISupportTicket>("SupportTicket", userSchema);


