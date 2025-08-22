/* eslint-disable */

// Handle uncaught exception
process.on("uncaughtException", (err: unknown) => {
  console.log("Uncaught exception");

  if (err instanceof Error) {
    console.log(err);
    console.log(err.name, err.message);
  } else {
    console.log(err);
  }

  process.exit(1);
});

import app from "./app";
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config({ path: "./config.env" });

mongoose
  .connect(process.env.DB_CONNECTION_STRING as string, {})
  .then(() => {
    console.log("Database connection successful");
  })
  .catch((err) => {
    console.error("Database connection error:", err);
  });

if (require.main === module) {
  const port = Number(process.env.PORT || 4000);
  const server = app.listen(port, "localhost", () => {
    console.log(`Server is listening on port ${port}`);
  });

  // Handle unhandled rejections
  process.on("unhandledRejection", (err: unknown) => {
    console.log("Unhandled error rejections");

    if (err instanceof Error) {
      console.log(err);
      console.log(err.name, err.message);
    } else {
      console.log(err);
    }

    server.close(() => {
      process.exit(1);
    });
  });
}

// Export app for Vercel or testing
export default app;
