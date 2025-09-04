/* eslint-disable */
import dotenv from "dotenv";
import mongoose from "mongoose";
import app from "./app";

// Load environment variables
dotenv.config({ quiet: true });

const DB_URI = process.env.DB_CONNECTION_STRING as string;
const PORT = Number(process.env.PORT || 4000);

/**
 * Graceful shutdown helper
 */
function shutdown(server: import("http").Server, code: number, reason: string) {
  console.error(`💥 Shutting down due to ${reason}`);
  server.close(() => process.exit(code));
}

/**
 * Global error handlers (before anything else)
 */
process.on("uncaughtException", (err: unknown) => {
  console.error(
    "❌ Uncaught Exception:",
    err instanceof Error ? err.stack : err
  );
  process.exit(1);
});

process.on("unhandledRejection", (reason: unknown) => {
  console.error("❌ Unhandled Promise Rejection:", reason);
  process.exit(1);
});

/**
 * Database connection
 */
mongoose
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
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });

  // Graceful shutdown on signals (Docker/K8s friendly)
  process.on("SIGTERM", () => shutdown(server, 0, "SIGTERM"));
  process.on("SIGINT", () => shutdown(server, 0, "SIGINT"));
}

/**
 * Export app for Vercel / serverless / testing
 */
export default app;
