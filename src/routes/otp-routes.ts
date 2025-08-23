import { verifyClientUsingOtp } from "@/controllers/otp-controller";
import express, { Router } from "express";

const router: Router = express.Router();

// /api/v1/otp

// client auth routes
router.post("/client/verify", verifyClientUsingOtp);

export default router;
