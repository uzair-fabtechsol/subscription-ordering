import { createSupportTicket, deleteSupportTicket, getAllSupportTickets, getSupportTicketById, updateSupportTicket } from "@/controllers/support-ticket-controller";
import { restrictedTo } from "@/middlewares/restricted-to";
import { RequestHandler, Router } from "express";


const router = Router();
 
router.post("/",restrictedTo(["client",'supplier']) as unknown as RequestHandler, createSupportTicket);
router.get("/",restrictedTo(["client","admin","supplier"]) as unknown as RequestHandler, getAllSupportTickets);
router.get("/:id", getSupportTicketById);
router.put("/:id",restrictedTo(["admin"]) as unknown as RequestHandler, updateSupportTicket);
router.delete("/:id",restrictedTo(["admin"]) as unknown as RequestHandler, deleteSupportTicket);

export default router;
