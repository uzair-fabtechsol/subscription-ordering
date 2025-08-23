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
router.post("/supplier/signup", signupSupplier);
router.post("/supplier/signin", signinSupplier);
router.get("/supplier/curr", getCurrSupplier);

// client auth routes
router.post("/client/signup", signupClient);

export default router;
