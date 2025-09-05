import { IProductReview } from "@/types/products-reviews-type";
import mongoose, { Schema, Document } from "mongoose";

const reviewSchema = new Schema <IProductReview>({
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    product: {
        type: Schema.Types.ObjectId,
        ref: "Product",
        required: true,
    },
    rating: {
        type: Number,
        required: true,
    },
    comment: {
        type: String,
        required: true,
    },
  

}
,  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete (ret as any).__v;
        return ret;
      },
    },
  }
);

const ProductReviewModel = mongoose.model<IProductReview & Document>(
  "ProductReview",
  reviewSchema
);

export default ProductReviewModel;