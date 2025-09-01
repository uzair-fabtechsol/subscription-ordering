import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import { ProductModel } from "@/models/product-model";
import { AppError } from "@/utils/AppError";

// Extend Request type for TS safety if needed
interface ProductRequest extends Request {
  params: {
    id: string;
  };
  body: any; // Keep broad to avoid mismatch with model's interface inconsistencies
}

// CREATE
export const createProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      name,
      category,
      images,
      stock,
      description,
      price,
      discount,
      profit,
      status,
    } = req.body as {
      name: string;
      category: string;
      images?: string[];
      stock: number;
      description?: string;
      price: number;
      discount?: number;
      profit?: number;
      status?: string;
    };

    if (!name) return next(new AppError("Product name is required", 400));
    if (!category || !Types.ObjectId.isValid(category))
      return next(new AppError("Valid category is required", 400));
    if (stock === undefined)
      return next(new AppError("Stock quantity is required", 400));
    if (price === undefined)
      return next(new AppError("Price is required", 400));

    // Optional: ensure unique name within the same category
    const existing = await ProductModel.findOne({ name, category });
    if (existing) {
      return next(
        new AppError("Product with this name already exists in the category", 400)
      );
    }

    // Align with schema enum (fallback to a valid default if not provided)
    const payload: any = {
      name,
      category,
      images,
      stock,
      description,
      price,
      discount,
      profit,
      status: status ?? "in_stock",
    };

    const product = await ProductModel.create(payload);

    return res.status(201).json({
      status: "success",
      data: product,
    });
  } catch (err) {
    return next(err);
  }
};

// READ ALL (with filtering, search, optional pagination)
export const getProducts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      page,
      limit,
      search,
      name,
      category: categoryId,
      status,
      minPrice,
      maxPrice,
      minStock,
      maxStock,
    } = req.query as Record<string, string | undefined>;

    const filter: Record<string, any> = {};

    // Search by name (case-insensitive)
    const term = (search ?? name)?.toString().trim();
    if (term) {
      filter.name = { $regex: term, $options: "i" };
    }

    // Filter by category
    if (categoryId && Types.ObjectId.isValid(categoryId)) {
      filter.category = new Types.ObjectId(categoryId);
    }

    // Filter by status
    if (status) {
      filter.status = status;
    }

    // Price range filter
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    // Stock range filter
    if (minStock || maxStock) {
      filter.stock = {};
      if (minStock) filter.stock.$gte = Number(minStock);
      if (maxStock) filter.stock.$lte = Number(maxStock);
    }

    const hasPagination = page !== undefined || limit !== undefined;

    if (hasPagination) {
      const pageNum = Math.max(parseInt(page ?? "1", 10) || 1, 1);
      const limitNum = Math.min(
        Math.max(parseInt(limit ?? "10", 10) || 10, 1),
        100
      );
      const skip = (pageNum - 1) * limitNum;

      const [products, total] = await Promise.all([
        ProductModel.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .select(
            "name category images stock description price discount profit status createdAt"
          )
          .populate({ path: "category", select: "name" })
          .lean(),
        ProductModel.countDocuments(filter),
      ]);

      return res.status(200).json({
        status: "success",
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        results: products.length,
        data: products,
      });
    } else {
      const products = await ProductModel.find(filter)
        .sort({ createdAt: -1 })
        .select(
          "name category images stock description price discount profit status createdAt"
        )
        .populate({ path: "category", select: "name" })
        .lean();

      return res.status(200).json({
        status: "success",
        results: products.length,
        data: products,
      });
    }
  } catch (err) {
    return next(err);
  }
};

// READ ONE
export const getProductById = async (
  req: ProductRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    if (!Types.ObjectId.isValid(id)) {
      return next(new AppError("Invalid product ID", 400));
    }

    const product = await ProductModel.findById(id)
      .select(
        "name category images stock description price discount profit status createdAt updatedAt"
      )
      .populate({ path: "category", select: "name" });

    if (!product) {
      return next(new AppError("Product not found", 404));
    }

    return res.status(200).json({
      status: "success",
      data: product,
    });
  } catch (err) {
    return next(err);
  }
};

// UPDATE
export const updateProduct = async (
  req: ProductRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    if (!Types.ObjectId.isValid(id)) {
      return next(new AppError("Invalid product ID", 400));
    }

    // Validate category if provided
    if (req.body?.category && !Types.ObjectId.isValid(req.body.category)) {
      return next(new AppError("Invalid category ID", 400));
    }

    // Prevent duplicates on update (same name within same category)
    if (req.body?.name || req.body?.category) {
      const targetCategory = req.body.category;
      const targetName = req.body.name;

      if (targetName && targetCategory && Types.ObjectId.isValid(targetCategory)) {
        const duplicate = await ProductModel.findOne({
          _id: { $ne: id },
          name: targetName,
          category: targetCategory,
        });
        if (duplicate) {
          return next(
            new AppError(
              "Another product with this name already exists in the category",
              400
            )
          );
        }
      }
    }

    const product = await ProductModel.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    })
      .select(
        "name category images stock description price discount profit status createdAt updatedAt"
      )
      .populate({ path: "category", select: "name" });

    if (!product) {
      return next(new AppError("Product not found", 404));
    }

    return res.status(200).json({
      status: "success",
      data: product,
    });
  } catch (err) {
    return next(err);
  }
};

// DELETE
export const deleteProduct = async (
  req: ProductRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    if (!Types.ObjectId.isValid(id)) {
      return next(new AppError("Invalid product ID", 400));
    }

    const product = await ProductModel.findByIdAndDelete(id);

    if (!product) {
      return next(new AppError("Product not found", 404));
    }

    return res.status(200).json({
      status: "success",
      message: "Product deleted successfully",
    });
  } catch (err) {
    return next(err);
  }
};
