import { Router } from "express";
import authRoutes from "./auth-routes";
import categoryRoutes from "./category-routes";
import productRoutes from "./product-routes";
import orderRoutes from "./order-routes";
import supportTicketRoutes from "./supportTicket-routes";
import productReviewRoutes from "./product-reviews-routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/category", categoryRoutes);
router.use("/product", productRoutes);
router.use("/order", orderRoutes);
router.use("/support-ticket", supportTicketRoutes);
router.use("/product-review", productReviewRoutes);

export default router;
