import {
  checkAuthUser,
  convertClientToSupplier,
  getCurrSupplierOrCLient,
  signinSupplierOrClient,
  signupClient,
  signupSupplier,
  verifyClientUsingOtp,
  verifySupplierUsingOtp,
} from "@/controllers/auth-controller";
import express, { RequestHandler, Router } from "express";

const router: Router = express.Router();

// /api/v1/users

// supplier  routes
router.post("/supplier/signup", signupSupplier);
router.get("/supplier/curr", getCurrSupplierOrCLient);
router.post("/supplier/signin", signinSupplierOrClient);
router.post("/supplier/verify", verifySupplierUsingOtp);

// client  routes
router.post("/client/signup", signupClient);
router.get("/client/curr", getCurrSupplierOrCLient);
router.post("/client/signin", signinSupplierOrClient);
router.post("/client/verify", verifyClientUsingOtp);
router.patch(
  "/convert-client-to-supplier",
  checkAuthUser(["client"]) as RequestHandler,
  convertClientToSupplier as RequestHandler
);

export default router;
