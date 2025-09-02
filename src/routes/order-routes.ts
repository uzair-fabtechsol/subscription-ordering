import { Router } from "express";
import {
  createOrder,
  getOrders,
  getOrderById,
  updateOrder,
  deleteOrder,
} from "@/controllers/order-controller";

const router = Router();
    
// CREATE
router.post("/", createOrder);

// READ ALL
router.get("/", getOrders);

// READ ONE
router.get("/:id", getOrderById);

// UPDATE
router.put("/:id", updateOrder);

// DELETE
router.delete("/:id", deleteOrder);

export default router;
