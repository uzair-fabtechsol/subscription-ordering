import { Request, Response } from "express";

import { asyncHandler } from "@/utils/asyncHandler";
import { AppError } from "@/utils/AppError";
import { SupportTicketModel } from "@/models/support-ticket";
import mySendMail from "@/utils/mailHelper";
import { CustomRequest } from "@/types/modified-requests-types";

// ✅ Create ticket
export const createSupportTicket = asyncHandler(async (req: Request, res: Response) => {
 
  const request = req as CustomRequest

  const { name, subject, message,attachments } = req.body;
 


  if (!name || !message ) {
    throw new AppError("Name, message, and user are required", 400);
  }

  const ticket = await SupportTicketModel.create({ attachments,name, subject, message, user: request?.user?._id},);

  // Send notification email (optional)
  await mySendMail({
    to:"husnain483271@gmail.com",
    subject: `New Support Ticket: ${subject || "No subject"}`,
    template: "support-ticket",
    templateData: { name, subject, message, },
  });

  res.status(201).json({ success: true, data: ticket });
});

export const getAllSupportTickets = asyncHandler(async (req: Request, res: Response) => {
  const request = req as CustomRequest
  // Check if user is authenticated
  if (!req.user) {
    res.status(401);
    throw new Error('User not authenticated');
  }

  // Extract pagination parameters from query (default: page=1, limit=10)
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  let tickets;
  let total: number;

  if (request.user.userType === 'admin') {
    
    total = await SupportTicketModel.countDocuments();
    tickets = await SupportTicketModel.find()
      .populate('user', 'firstName lastName email')
      .skip(skip)
      .limit(limit);
  } else {
 
    total = await SupportTicketModel.countDocuments({ user: request.user._id });
    tickets = await SupportTicketModel.find({ user: request.user._id })
      .populate('user', 'firstName lastName email')
      .skip(skip)
      .limit(limit);
  }

  res.status(200).json({
    success: true,
       total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    results: tickets,
  
   
    
  });
});
// ✅ Get single ticket by ID
export const getSupportTicketById = asyncHandler(async (req: Request, res: Response) => {
  const ticket = await SupportTicketModel.findById(req.params.id).populate("user", "firstName lastName email");

  if (!ticket) throw new AppError("Ticket not found", 404);

  res.status(200).json({ success: true, data: ticket });
});

// ✅ Update ticket
export const updateSupportTicket = asyncHandler(async (req: Request, res: Response) => {
  const ticket = await SupportTicketModel.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!ticket) throw new AppError("Ticket not found", 404);

  res.status(200).json({ success: true, data: ticket });
});

// ✅ Delete ticket
export const deleteSupportTicket = asyncHandler(async (req: Request, res: Response) => {
  const ticket = await SupportTicketModel.findByIdAndDelete(req.params.id);

  if (!ticket) throw new AppError("Ticket not found", 404);

  res.status(200).json({ success: true, message: "Ticket deleted successfully" });
});
