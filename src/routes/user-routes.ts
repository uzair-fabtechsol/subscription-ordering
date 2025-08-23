import {
  getCurrSupplier,
  signinSupplier,
  signupClient,
  signupSupplier,
} from "@/controllers/user-controller";
import express, { Router } from "express";

const router: Router = express.Router();

// /api/v1/users

// supplier auth routes
router.post("/signup/supplier", signupSupplier);
router.post("/signin/supplier", signinSupplier);
router.get("/curr/supplier", getCurrSupplier);

// client auth routes
router.post("/signup/client", signupClient);
export default router;
