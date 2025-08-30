/* eslint-disable */
import express, { Request, Response, NextFunction } from "express";
import morgan from "morgan";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import hpp from "hpp";
import mongoSanitize from "mongo-sanitize";
import { globalErrorHandler } from "./controllers/error-controller";
import { clearOtpCron } from "./cron/clear-otp-cron";
import passport from "./utils/passport";
import routes from "./routes/index";  // 👈 import central routes file

dotenv.config();

const app = express();

// http headers security
app.use(helmet());

// body parsing
app.use(express.json({ limit: "10kb" }));

// cookie parser
app.use(cookieParser());

// parameter pollution to remove duplicate query params
app.use(hpp({}));

// setting cors
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

app.use(passport.initialize());

// logger in dev mode
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// limiting request from same api
const limiter = rateLimit({
  max: 100,
  windowMs: 30 * 60 * 1000,
  message: "Too many requests.",
  validate: { trustProxy: false },
});
app.use(limiter);

app.set("trust proxy", true);

clearOtpCron();

app.use("/api", routes);

// Handle unknown routes (404)
app.use((req: Request, res: Response) => {
  res.status(404).json({
    status: "fail",
    message: `Cannot find ${req.originalUrl} on this server.`,
  });
});

// handling errors globally
app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  globalErrorHandler(err, req, res);
});

export default app;


