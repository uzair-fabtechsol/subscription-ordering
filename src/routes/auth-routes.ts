import {
  adminSignin,
  getCurrSupplierOrCLient,
  sendJwtGoogle,
  signinSupplierOrClient,
  signupClient,
  signupSupplier,
  verifyClientUsingOtp,
  verifySupplierUsingOtp,
  forgotPassword,
  resetPassword,
  googleAuth,
} from "@/controllers/auth-controller";
import express, { RequestHandler, Router } from "express";
import passport from "../utils/passport";

const router: Router = express.Router();

// /api/auth

// DIVIDER supplier  routes
router.post("/supplier/signup", signupSupplier);
router.post("/supplier/verify", verifySupplierUsingOtp);
router.post("/supplier/resend-otp", signupSupplier);

// DIVIDER client  routes
router.post("/client/signup", signupClient);
router.post("/client/verify", verifyClientUsingOtp);
router.post("/client/resend-otp", signupClient);

// DIVIDER admin routes
router.post("/admin/signin", adminSignin);

// DIVIDER google auth routes
router.get("/google", googleAuth);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${process.env.CLIENT_URL}/login?error=oauth`,
  }),
  sendJwtGoogle as RequestHandler
);

// DIVIDER common routes
router.post("/forgot-password", forgotPassword);
router.patch("/reset-password", resetPassword);
router.post("/signin", signinSupplierOrClient);
router.get("/curr", getCurrSupplierOrCLient);

export default router;
