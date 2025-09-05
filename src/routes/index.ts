import { Router } from "express";
import authRoutes from "./auth-routes";
import categoryRoutes from "./category-routes";
import productRoutes from "./product-routes";
import orderRoutes from "./order-routes";
import userRoutes from "./user-routes";
import webhookRoutes from "./webhook-routes";
const router = Router();

router.use("/auth", authRoutes);
router.use("/category", categoryRoutes);
router.use("/product", productRoutes);
router.use("/order", orderRoutes);
router.use("/user", userRoutes);
// router.use("/webhooks", webhookRoutes);



// /suuplier/onboarding-status
export default router;
