"use strict";
/* eslint-disable */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Handle uncaught exception
process.on("uncaughtException", (err) => {
    console.log("Uncaught exception");
    if (err instanceof Error) {
        console.log(err);
        console.log(err.name, err.message);
    }
    else {
        console.log(err);
    }
    process.exit(1);
});
const app_1 = __importDefault(require("./app"));
const dotenv_1 = __importDefault(require("dotenv"));
const mongoose_1 = __importDefault(require("mongoose"));
dotenv_1.default.config();
mongoose_1.default
    .connect(process.env.DB_CONNECTION_STRING, {})
    .then(() => {
    console.log("Database connection successful");
})
    .catch((err) => {
    console.error("Database connection error:", err);
});
if (require.main === module) {
    const port = Number(process.env.PORT || 4000);
    const server = app_1.default.listen(port, "localhost", () => {
        console.log(`Server is listening on port ${port}`);
    });
    // Handle unhandled rejections
    process.on("unhandledRejection", (err) => {
        console.log("Unhandled error rejections");
        if (err instanceof Error) {
            console.log(err);
            console.log(err.name, err.message);
        }
        else {
            console.log(err);
        }
        server.close(() => {
            process.exit(1);
        });
    });
}
// Export app for Vercel or testing
exports.default = app_1.default;
