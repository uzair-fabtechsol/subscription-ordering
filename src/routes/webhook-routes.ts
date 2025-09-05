import { Router } from "express";
import express from "express";
import {
  handleStripeWebhookMainAccount,
} from "@/controllers/main-account-controller";
import {
  handleStripeWebhookConnectedAccount,
} from "@/controllers/connected-account-controller";

const router = Router();

// Use express.raw ONLY here
router.post(
  "/main-account",
  express.raw({ type: "application/json" }),
  handleStripeWebhookMainAccount
);

router.post(
  "/connected-account",
  express.raw({ type: "application/json" }),
  handleStripeWebhookConnectedAccount
);

export default router;
