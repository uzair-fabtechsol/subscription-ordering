import { Router } from "express";
import {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
} from "@/controllers/category-controller";

const router = Router();

// CREATE
router.post("/", createCategory);

// READ ALL
router.get("/", getCategories);

// READ ONE
router.get("/:id", getCategoryById);

// UPDATE
router.put("/:id", updateCategory);

// DELETE
router.delete("/:id", deleteCategory);

export default router;
