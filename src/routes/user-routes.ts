import express, {
  NextFunction,
  Request,
  RequestHandler,
  Response,
  Router,
} from "express";
import {
  attachPaymentMethod,
  convertClientToSupplier,
  createSetupIntent,
  editClientPersonalInfo,
  editSupplierPersonalInfo,
  getClientPersonalInfo,
  getSupplierPersonalInfo,
  listPaymentMethods,
} from "@/controllers/user-controller";
import { restrictedTo } from "@/middlewares/restricted-to";

const router: Router = express.Router();

// DIVIDER Client Routes

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

// DIVIDER Supplier routes

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

// DIVIDER Admin Routes
