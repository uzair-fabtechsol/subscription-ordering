import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import { CategoryModel } from "@/models/category-model";
import { AppError } from "@/utils/AppError";
import { ICategory } from "@/types/category-types";
import { IResponseObject } from "@/types/response-object-types";

// Extend Request type for TS safety if needed
interface CategoryRequest extends Request {
  params: {
    id: string;
  };
  body: Partial<ICategory>;
}

// CREATE
export const createCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, description, image, status } = req.body;

    const existing = await CategoryModel.findOne({ name });
    if (existing) {
      return next(new AppError("Category with this name already exists", 400));
    }

    const category = await CategoryModel.create({
      name,
      description,
      image,
      status,
    });

    const responseObject: IResponseObject = {
      status: "success",
      message: "Category created",
      data: { category },
    };

    return res.status(201).json(responseObject);
  } catch (err) {
    return next(err);
  }
};

export const getCategories = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { page, limit, search, name, status } = req.query as {
      page?: string;
      limit?: string;
      search?: string;
      name?: string;
      status?: string;
    };

    // ✅ Build filter
    const filter: Record<string, any> = {};
    const term = (search ?? name)?.toString().trim();

    if (term) {
      filter.name = { $regex: term, $options: "i" };
    }

    if (status) {
      filter.status = status;
    }

    // ✅ Parse pagination
    const pageNum = Math.max(parseInt(page ?? "1", 10) || 1, 1);
    const limitNum = Math.min(
      Math.max(parseInt(limit ?? "10", 10) || 10, 1),
      100
    );
    const skip = (pageNum - 1) * limitNum;

    // ✅ Apply search/filter across whole dataset, THEN paginate
    const [categories, total] = await Promise.all([
      CategoryModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .select("name description image status createdAt")
        .lean(),
      CategoryModel.countDocuments(filter),
    ]);

    const responseObject: IResponseObject = {
      status: "success",
      message: "Fetch all categories success",
      data: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        results: categories.length,
        categories,
      },
    };

    return res.status(200).json(responseObject);
  } catch (err) {
    return next(err);
  }
};

// READ ONE
export const getCategoryById = async (
  req: CategoryRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    if (!Types.ObjectId.isValid(id)) {
      return next(new AppError("Invalid category ID", 400));
    }

    const category = await CategoryModel.findById(id);

    if (!category) {
      return next(new AppError("Category not found", 404));
    }

    const responseObject: IResponseObject = {
      status: "success",
      message: "Fetch catagory by id success",
      data: {
        category,
      },
    };

    return res.status(200).json(responseObject);
  } catch (err) {
    return next(err);
  }
};

// UPDATE
export const updateCategory = async (
  req: CategoryRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    if (!Types.ObjectId.isValid(id)) {
      return next(new AppError("Invalid category ID", 400));
    }

    const category = await CategoryModel.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!category) {
      return next(new AppError("Category not found", 404));
    }

    const responseObject: IResponseObject = {
      status: "success",
      message: "Category updated",
      data: {
        category,
      },
    };

    return res.status(200).json(responseObject);
  } catch (err) {
    return next(err);
  }
};

// DELETE
export const deleteCategory = async (
  req: CategoryRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    if (!Types.ObjectId.isValid(id)) {
      return next(new AppError("Invalid category ID", 400));
    }

    const category = await CategoryModel.findByIdAndDelete(id);

    if (!category) {
      return next(new AppError("Category not found", 404));
    }

    const responseObject: IResponseObject = {
      status: "success",
      message: "Category deleted successfully",
    };

    return res.status(200).json(responseObject);
  } catch (err) {
    return next(err);
  }
};
