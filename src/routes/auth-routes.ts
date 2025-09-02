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
  getAllClients,
  getClientOnId,
  updateClientOnId,
  deleteClientOnId,
  createSetupIntent,
  attachPaymentMethod,
  listPaymentMethods,
  getAdminPersonalInfo,
  editAdminPersonalInfo,
  getSupplierPersonalInfo,
  editSupplierPersonalInfo,
  getClientPersonalInfo,
  editClientPersonalInfo,
  editUserSecurityCredentials,
  forgotPassword,
  resetPassword,
} from "@/controllers/auth-controller";
import express, {
  NextFunction,
  Request,
  RequestHandler,
  Response,
  Router,
} from "express";
import passport from "../utils/passport";
import { restrictedTo } from "@/middlewares/restricted-to";

const router: Router = express.Router();

// /api/auth

// DIVIDER supplier  routes
router.post("/supplier/signup", signupSupplier);
router.get("/supplier/curr", getCurrSupplierOrCLient);
router.post("/supplier/signin", signinSupplierOrClient);
router.post("/supplier/verify", verifySupplierUsingOtp);
router.get(
  "/supplier/personal-information",
  restrictedTo(["supplier"]) as unknown as RequestHandler,
  getSupplierPersonalInfo as RequestHandler
);
router.patch(
  "/supplier/personal-information",
  restrictedTo(["supplier"]) as unknown as RequestHandler,
  editSupplierPersonalInfo as RequestHandler
);

// DIVIDER client  routes
router.post("/client/signup", signupClient);
router.get("/client/curr", getCurrSupplierOrCLient);
router.post("/client/signin", signinSupplierOrClient);
router.post("/client/verify", verifyClientUsingOtp);


/// PAYMENT METHODS (CLIENT ONLY)
router.post("/client/create-setup-intent", createSetupIntent);
router.post("/client/attach-payment-method", attachPaymentMethod);
router.post("/client/list-payment-methods", listPaymentMethods);
router.patch(
  "/convert-client-to-supplier",
  restrictedTo(["client"]) as unknown as RequestHandler,
  convertClientToSupplier as RequestHandler
);

router.get(
  "/client/personal-information",
  restrictedTo(["client"]) as unknown as RequestHandler,
  getClientPersonalInfo as RequestHandler
);

router.patch(
  "/client/personal-information",
  restrictedTo(["client"]) as unknown as RequestHandler,
  editClientPersonalInfo as RequestHandler
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

router.get(
  "/clients",
  restrictedTo(["admin"]) as unknown as RequestHandler,
  getAllClients as RequestHandler
);

router.get(
  "/clients/:id",
  // restrictedTo(["admin"]) as unknown as RequestHandler,
  getClientOnId as RequestHandler
);

router.patch(
  "/clients/:id",
  // restrictedTo(["admin"]) as unknown as RequestHandler,
  updateClientOnId as RequestHandler
);

router.delete(
  "/clients/:id",
  // restrictedTo(["admin"]) as unknown as RequestHandler,
  deleteClientOnId as RequestHandler
);

router.get(
  "/admin/personal-information",
  restrictedTo(["admin"]) as unknown as RequestHandler,
  getAdminPersonalInfo as RequestHandler
);

router.patch(
  "/admin/personal-information",
  restrictedTo(["admin"]) as unknown as RequestHandler,
  editAdminPersonalInfo as RequestHandler
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

// DIVIDER common routes
router.patch(
  "/security-credentials",
  restrictedTo(["admin", "client", "supplier"]) as unknown as RequestHandler,
  editUserSecurityCredentials as RequestHandler
);

router.post("/forgot-password", forgotPassword);

router.patch("/reset-password", resetPassword);

export default router;
