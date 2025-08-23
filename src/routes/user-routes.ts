import {
  getCurrSupplierOrCLient,
  signinSupplierOrClient,
  signupClient,
  signupSupplier,
} from "@/controllers/user-controller";
import express, { Router } from "express";

const router: Router = express.Router();

// /api/v1/users

// supplier auth routes
router.post("/supplier/signup", signupSupplier);
router.get("/supplier/curr", getCurrSupplierOrCLient);
router.post("/supplier/signin", signinSupplierOrClient);

// client auth routes
router.post("/client/signup", signupClient);
router.get("/client/curr", getCurrSupplierOrCLient);
router.post("/client/signin", signinSupplierOrClient);

export default router;
