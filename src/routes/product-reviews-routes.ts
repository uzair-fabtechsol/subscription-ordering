import { RequestHandler, Router } from "express";


import { restrictedTo } from "@/middlewares/restricted-to";
import { createProductReview, deleteProductReview, getAllProductReviews, getProductReviewById, getReviewsByProductId, updateProductReview } from "@/controllers/product-review-controller";

const router = Router();

router.post("/", restrictedTo(["client", "supplier", "admin"]) as unknown as RequestHandler, createProductReview);
router.get("/", getAllProductReviews);
router.get("/:id", getProductReviewById);
router.put("/:id", restrictedTo(["client", "supplier"]) as unknown as RequestHandler, updateProductReview);
router.delete("/:id", restrictedTo(["client", "supplier", "admin"]) as unknown as RequestHandler, deleteProductReview);
router.get("/:productId/reviews", getReviewsByProductId);
export default router;