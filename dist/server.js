"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable */
const dotenv_1 = __importDefault(require("dotenv"));
const mongoose_1 = __importDefault(require("mongoose"));
const app_1 = __importDefault(require("./app"));
// Load environment variables
dotenv_1.default.config();
const DB_URI = process.env.DB_CONNECTION_STRING;
const PORT = Number(process.env.PORT || 4000);
/**
 * Graceful shutdown helper
 */
function shutdown(server, code, reason) {
    console.error(`💥 Shutting down due to ${reason}`);
    server.close(() => process.exit(code));
}
/**
 * Global error handlers (before anything else)
 */
process.on("uncaughtException", (err) => {
    console.error("❌ Uncaught Exception:", err instanceof Error ? err.stack : err);
    process.exit(1);
});
process.on("unhandledRejection", (reason) => {
    console.error("❌ Unhandled Promise Rejection:", reason);
    process.exit(1);
});
/**
 * Database connection
 */
mongoose_1.default
    .connect(DB_URI)
    .then(() => {
    console.log("✅ Database connection successful");
})
    .catch((err) => {
    console.error("❌ Database connection error:", err);
    process.exit(1);
});
/**
 * Start server (only if executed directly, not when imported by tests)
 */
if (require.main === module) {
    const server = app_1.default.listen(PORT, "0.0.0.0", () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
    // Graceful shutdown on signals (Docker/K8s friendly)
    process.on("SIGTERM", () => shutdown(server, 0, "SIGTERM"));
    process.on("SIGINT", () => shutdown(server, 0, "SIGINT"));
}
/**
 * Export app for Vercel / serverless / testing
 */
exports.default = app_1.default;
