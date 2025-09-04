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
} from "@/controllers/auth-controller";
import express, { RequestHandler, Router } from "express";
import passport from "../utils/passport";

const router: Router = express.Router();

// /api/auth

// DIVIDER supplier  routes
router.post("/supplier/signup", signupSupplier);
router.post("/supplier/verify", verifySupplierUsingOtp);
router.get("/supplier/curr", getCurrSupplierOrCLient);
router.post("/supplier/signin", signinSupplierOrClient);

// DIVIDER client  routes
router.post("/client/signup", signupClient);
router.get("/client/curr", getCurrSupplierOrCLient);
router.post("/client/signin", signinSupplierOrClient);
router.post("/client/verify", verifyClientUsingOtp);

// DIVIDER admin routes
router.post("/admin/signin", adminSignin);

// DIVIDER google auth routes
router.get("/google", (req, res, next) => {
  // stash userType temporarily in the state param
  const userType = req.query.userType as string;
  const companyName = req.query.companyName as string;
  const phoneNumber = req.query.phoneNumber as string;

  const state =
    userType === "supplier"
      ? `userType=supplier,companyName=${companyName},phoneNumber=${phoneNumber}`
      : `userType=client`;

  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
    state,
  })(req, res, next);
});

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

export default router;
