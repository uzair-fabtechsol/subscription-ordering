import {
  getCurrSupplier,
  signinSupplier,
  signupSupplier,
} from "@/controllers/user-controller";
import express, { Router } from "express";

const router: Router = express.Router();

// /api/v1/users
router.post("/signup/supplier", signupSupplier);
router.post("/signin/supplier", signinSupplier);
router.get("/curr/supplier", getCurrSupplier);
export default router;
