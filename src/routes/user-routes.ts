import { signupSupplier } from "@/controllers/user-controller";
import express, { Router } from "express";

const router: Router = express.Router();

// /api/vi1/users
router.post("/signup/supplier", signupSupplier);

export default router;
