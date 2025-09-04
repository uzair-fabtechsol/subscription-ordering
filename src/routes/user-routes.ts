import express, { RequestHandler, Router } from "express";
import {
  attachPaymentMethod,
  convertClientToSupplier,
  createSetupIntent,
  deleteClientOnId,
  deleteSupplierOnId,
  editAdminPersonalInfo,
  editClientPersonalInfo,
  editSupplierPersonalInfo,
  editUserSecurityCredentials,
  getAdminPersonalInfo,
  getAllClients,
  getAllSuppliers,
  getClientOnId,
  getClientPersonalInfo,
  getSupplierOnId,
  getSupplierPersonalInfo,
  listPaymentMethods,
  removePaymentMethod,
  setDefaultPaymentMethod,
  updateClientOnId,
  updateSupplierOnId,
} from "@/controllers/user-controller";
import { restrictedTo } from "@/middlewares/restricted-to";

const router: Router = express.Router();

// DIVIDER Client Routes

/// PAYMENT METHODS (CLIENT ONLY)
router.post("/client/create-setup-intent", createSetupIntent);
router.post("/client/attach-payment-method", attachPaymentMethod);
router.post("/client/detatch-payment-method", listPaymentMethods);
router.post("/client/list-payment-methods", listPaymentMethods);
router.post("/client/remove-payment-method", listPaymentMethods);


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

router.get(
  "/suppliers",
  restrictedTo(["admin"]) as unknown as RequestHandler,
  getAllSuppliers as RequestHandler
);

router.get(
  "/suppliers/:id",
  restrictedTo(["admin"]) as unknown as RequestHandler,
  getSupplierOnId as RequestHandler
);

router.patch(
  "/suppliers/:id",
  restrictedTo(["admin"]) as unknown as RequestHandler,
  updateSupplierOnId as RequestHandler
);

router.delete(
  "/suppliers/:id",
  restrictedTo(["admin"]) as unknown as RequestHandler,
  deleteSupplierOnId as RequestHandler
);

router.get(
  "/clients",
  restrictedTo(["admin"]) as unknown as RequestHandler,
  getAllClients as RequestHandler
);

router.get(
  "/clients/:id",
  restrictedTo(["admin"]) as unknown as RequestHandler,
  getClientOnId as RequestHandler
);

router.patch(
  "/clients/:id",
  restrictedTo(["admin"]) as unknown as RequestHandler,
  updateClientOnId as RequestHandler
);

router.delete(
  "/clients/:id",
  restrictedTo(["admin"]) as unknown as RequestHandler,
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

// DIVIDER common routes
router.patch(
  "/security-credentials",
  restrictedTo(["admin", "client", "supplier"]) as unknown as RequestHandler,
  editUserSecurityCredentials as RequestHandler
);
