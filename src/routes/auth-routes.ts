import {
  adminSignin,
  convertClientToSupplier,
  getCurrSupplierOrCLient,
  sendJwtGoogle,
  signinSupplierOrClient,
  signupClient,
  signupSupplier,
  verifyClientUsingOtp,
  verifySupplierUsingOtp,
  getAllSuppliers,
  getSupplierOnId,
  deleteSupplierOnId,
  updateSupplierOnId,
} from "@/controllers/auth-controller";
import express, { RequestHandler, Router } from "express";
import passport from "../utils/passport";
import { restrictedTo } from "@/middlewares/restricted-to";

const router: Router = express.Router();

// /api/auth

// DIVIDER supplier  routes
router.post("/supplier/signup", signupSupplier);
router.get("/supplier/curr", getCurrSupplierOrCLient);
router.post("/supplier/signin", signinSupplierOrClient);
router.post("/supplier/verify", verifySupplierUsingOtp);

// DIVIDER client  routes
router.post("/client/signup", signupClient);
router.get("/client/curr", getCurrSupplierOrCLient);
router.post("/client/signin", signinSupplierOrClient);
router.post("/client/verify", verifyClientUsingOtp);
router.patch(
  "/convert-client-to-supplier",
  restrictedTo(["client"]) as unknown as RequestHandler,
  convertClientToSupplier as RequestHandler
);

// DIVIDER admin routes
router.post("/admin/signin", adminSignin);

router.get(
  "/suppliers",
  // restrictedTo(["admin"]) as unknown as RequestHandler,
  getAllSuppliers as RequestHandler
);

router.get(
  "/suppliers/:id",
  // restrictedTo(["admin"]) as unknown as RequestHandler,
  getSupplierOnId as RequestHandler
);

router.get(
  "/suppliers/:id",
  // restrictedTo(["admin"]) as unknown as RequestHandler,
  getSupplierOnId as RequestHandler
);

router.patch(
  "/suppliers/:id",
  // restrictedTo(["admin"]) as unknown as RequestHandler,
  updateSupplierOnId as RequestHandler
);

router.delete(
  "/suppliers/:id",
  // restrictedTo(["admin"]) as unknown as RequestHandler,
  deleteSupplierOnId as RequestHandler
);

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

export default router;
