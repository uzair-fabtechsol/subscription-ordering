import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import { AppError } from "../utils/AppError";
import ProductReviewModel from "@/models/products-review-model";
import { asyncHandler } from "@/utils/asyncHandler";
import { CustomRequest } from "@/types/modified-requests-types";

const createProductReview = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { rating, comment, product } = req.body;
    const result = req as CustomRequest;

    if (!rating || !comment || !product) {
        throw new AppError("Rating, comment, and product ID are required", 400);
    }

    const productReview = await ProductReviewModel.create({
        rating,
        comment,
        product: product,
        user: result.user._id,
    });

    res.status(201).json({ success: true, data: productReview });
});

const getAllProductReviews = asyncHandler(async (req: Request, res: Response) => {
    const productReviews = await ProductReviewModel.find().sort({ createdAt: -1 })
        .populate("user", "firstName lastName email")
        .populate("product");

    res.status(200).json({ success: true, data: productReviews });
});

const getProductReviewById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!Types.ObjectId.isValid(id)) {
        throw new AppError("Invalid review ID", 400);
    }

    const productReview = await ProductReviewModel.findById(id)
        .populate("user", "firstName lastName email")
        .populate("product");

    if (!productReview) {
        throw new AppError("Product review not found", 404);
    }

    res.status(200).json({ success: true, entrer: productReview });
});

const updateProductReview = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { rating, comment } = req.body;
    const result = req as CustomRequest;

    if (!Types.ObjectId.isValid(id)) {
        throw new AppError("Invalid review ID", 400);
    }

    const productReview = await ProductReviewModel.findById(id);

    if (!productReview) {
        throw new AppError("Product review not found", 404);
    }

    if (productReview.user.toString() !== result.user._id.toString()) {
        throw new AppError("Not authorized to update this review", 403);
    }

    if (rating !== undefined) productReview.rating = rating;
    if (comment !== undefined) productReview.comment = comment;

    await productReview.save();

    const updatedReview = await ProductReviewModel.findById(id)
        .populate("user", "firstName lastName email")
        .populate("product");

    res.status(200).json({ success: true, data: updatedReview });
});

const deleteProductReview = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = req as CustomRequest;

    if (!Types.ObjectId.isValid(id)) {
        throw new AppError("Invalid review ID", 400);
    }

    const productReview = await ProductReviewModel.findById(id);

    if (!productReview) {
        throw new AppError("Product review not found", 404);
    }

    if (productReview.user.toString() !== result.user._id.toString()) {
        throw new AppError("Not authorized to delete this review", 403);
    }

    await productReview.deleteOne();

    res.status(200).json({ success: true, message: "Product review deleted successfully" });
});
const getReviewsByProductId = asyncHandler(async (req: Request, res: Response) => {
    const { productId } = req.params;

    if (!Types.ObjectId.isValid(productId)) {
        throw new AppError("Invalid product ID", 400);
    }

    const productReviews = await ProductReviewModel.find({ product: productId }).sort({ createdAt: -1 })
        .populate("user", "firstName lastName email")
        .populate("product");

    if (!productReviews || productReviews.length === 0) {
        throw new AppError("No reviews found for this product", 404);
    }

    res.status(200).json({ success: true, data: productReviews });
});
export {
    createProductReview,
    getAllProductReviews,
    getProductReviewById,
    updateProductReview,
    deleteProductReview,
    getReviewsByProductId
};