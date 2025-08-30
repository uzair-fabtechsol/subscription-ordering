"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateOTP = generateOTP;
const crypto_1 = __importDefault(require("crypto"));
function generateOTP() {
    // Generate a random integer between 1000 and 9999
    const otp = crypto_1.default.randomInt(1000, 10000);
    return otp.toString();
}
