"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OtpModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const validator_1 = __importDefault(require("validator"));
const otpSchema = new mongoose_1.Schema({
    firstName: {
        type: String,
        minlength: [2, "First name must be at least 2 characters"],
        maxlength: [50, "First name must be less than 50 characters"],
        trim: true,
        required: true,
    },
    lastName: {
        type: String,
        maxlength: [50, "Last name must be less than 50 characters"],
        trim: true,
    },
    email: {
        type: String,
        required: [true, "Email is required"],
        unique: true,
        lowercase: true,
        trim: true,
        validate: {
            validator: (value) => validator_1.default.isEmail(value),
            message: "Please provide a valid email",
        },
    },
    password: {
        type: String,
        required: [true, "Password is required"],
        minlength: [6, "Password must be at least 6 characters"],
        maxlength: [128, "Password must be less than 128 characters"],
        validate: {
            validator: (value) => validator_1.default.isStrongPassword(value, {
                minLength: 6,
                minLowercase: 1,
                minUppercase: 1,
                minNumbers: 1,
                minSymbols: 0,
            }),
            message: "Password must contain at least 1 lowercase, 1 uppercase, and 1 number",
        },
    },
    otp: {
        type: Number,
        default: null,
        validate: {
            validator: (value) => value === null || /^[0-9]{4}$/.test(String(value)),
            message: "OTP must be a 4-digit number",
        },
    },
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 10 * 60 * 1000),
    },
    companyName: {
        type: String,
    },
    phoneNumber: {
        type: String,
        validate: {
            validator: (value) => validator_1.default.isMobilePhone(value),
            message: "Please provide a valid phone number",
        },
    },
}, {
    timestamps: true,
});
exports.OtpModel = mongoose_1.default.model("Otp", otpSchema);
