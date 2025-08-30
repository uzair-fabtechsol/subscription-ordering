"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable */
const express_1 = __importDefault(require("express"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const helmet_1 = __importDefault(require("helmet"));
const hpp_1 = __importDefault(require("hpp"));
const error_controller_1 = require("./controllers/error-controller");
const clear_otp_cron_1 = require("./cron/clear-otp-cron");
const passport_1 = __importDefault(require("./utils/passport"));
const index_1 = __importDefault(require("./routes/index")); // 👈 import central routes file
dotenv_1.default.config();
const app = (0, express_1.default)();
// http headers security
app.use((0, helmet_1.default)());
// body parsing
app.use(express_1.default.json({ limit: "10kb" }));
// cookie parser
app.use((0, cookie_parser_1.default)());
// parameter pollution to remove duplicate query params
app.use((0, hpp_1.default)({}));
// setting cors
app.use((0, cors_1.default)({
    origin: process.env.CLIENT_URL,
    credentials: true,
}));
app.use(passport_1.default.initialize());
// logger in dev mode
if (process.env.NODE_ENV === "development") {
    app.use((0, morgan_1.default)("dev"));
}
// limiting request from same api
const limiter = (0, express_rate_limit_1.default)({
    max: 100,
    windowMs: 30 * 60 * 1000,
    message: "Too many requests.",
    validate: { trustProxy: false },
});
app.use(limiter);
app.set("trust proxy", true);
(0, clear_otp_cron_1.clearOtpCron)();
app.use("/api/v1", index_1.default);
// Handle unknown routes (404)
app.use((req, res) => {
    res.status(404).json({
        status: "fail",
        message: `Cannot find ${req.originalUrl} on this server.`,
    });
});
// handling errors globally
app.use((err, req, res, next) => {
    (0, error_controller_1.globalErrorHandler)(err, req, res);
});
exports.default = app;
