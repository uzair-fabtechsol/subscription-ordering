"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendJwtGoogle = exports.convertClientToSupplier = exports.verifyClientUsingOtp = exports.signupClient = exports.signinSupplierOrClient = exports.getCurrSupplierOrCLient = exports.verifySupplierUsingOtp = exports.signupSupplier = exports.checkAuthUser = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const auth_model_1 = require("@/models/auth-model");
const AppError_1 = require("@/utils/AppError");
const generate_otp_1 = require("@/utils/generate-otp");
const otp_model_1 = require("@/models/otp-model");
const email_1 = require("@/utils/email");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// FUNCTION
const checkAuthUser = (allowedUserTypes) => async (req, res, next) => {
    try {
        // 1 : take the token out of headers
        const { authorization } = req.headers;
        const token = authorization?.startsWith("Bearer ")
            ? authorization.split(" ")[1]
            : null;
        // 2 : return error if no token exists
        if (!token) {
            return next(new AppError_1.AppError("Authorization token is missing or invalid", 401));
        }
        // 3 : decode/verify token
        const decodedToken = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET ? process.env.JWT_SECRET : "this_is_wrong_secret");
        // 4 : get the user id from token
        const userId = decodedToken.id;
        // 5 : get user from DB
        const user = await auth_model_1.UserModel.findById(userId);
        if (!user) {
            return next(new AppError_1.AppError("The user belonging to this token no longer exists", 401));
        }
        // 6 : check if user's type is in the allowed list
        if (!allowedUserTypes.includes(user.userType)) {
            return next(new AppError_1.AppError("You are not allowed to do this action", 403));
        }
        // 7 : attach user info to request
        req.userType = user.userType;
        req.user = user;
        next();
    }
    catch (err) {
        return next(err);
    }
};
exports.checkAuthUser = checkAuthUser;
// FUNCTION
const signupSupplier = async (req, res, next) => {
    try {
        console.log("Hello---------------------------------");
        console.log("request body----------------------------------------");
        console.log(req.body);
        // 1 : take the necessary data out
        const { firstName, lastName, email, companyName, phoneNumber, password } = req.body;
        // 2 : check for missing required fields
        if (!firstName || !email || !password || !companyName || !phoneNumber) {
            throw new AppError_1.AppError("Missing required field requiredFields=[firstName, email, password, companyName, phoneNumber ]", 400);
        }
        // 3 : generate an opt
        const otp = (0, generate_otp_1.generateOTP)();
        // 4 : send the otp to email
        const result = await (0, email_1.sendMail)(email, Number(otp));
        // 5 : if email was not sent successfully throw an error
        if (!result?.success) {
            throw new AppError_1.AppError("Sending otp to email failed", 500);
        }
        // 5 : make a document in otp collection
        await otp_model_1.OtpModel.create({
            firstName,
            lastName: lastName || "",
            email,
            password,
            companyName,
            phoneNumber,
            otp,
        });
        // 6 : send the response
        return res.status(200).json({
            status: "success",
            message: "Otp successfully sent to your email",
        });
    }
    catch (err) {
        return next(err);
    }
};
exports.signupSupplier = signupSupplier;
// FUNCTION
const verifySupplierUsingOtp = async (req, res, next) => {
    try {
        // 1 : take otp out of request body
        let { otp } = req.body;
        // 2 : check if otp exists
        if (!otp) {
            throw new AppError_1.AppError("Otp not provided", 400);
        }
        // 3 : convert the otp into number
        otp = Number(otp);
        // 4 : find the document against the concerned otp
        const otpDoc = await otp_model_1.OtpModel.findOne({ otp });
        // 6 : check if otp is expired or invalid
        if (!otpDoc || otpDoc.expiresAt < new Date()) {
            await otp_model_1.OtpModel.findByIdAndDelete(otpDoc?._id);
            throw new AppError_1.AppError("OTP invalid or expired", 400);
        }
        // 7 : signup the client, create a document in user collection and send a jwt
        const { firstName, lastName, email, password, companyName, phoneNumber } = otpDoc;
        let supplier = await auth_model_1.UserModel.create({
            firstName,
            lastName: lastName || "",
            email,
            password,
            userType: "supplier",
            companyName,
            phoneNumber,
        });
        supplier = supplier.toObject();
        // 8 : preparation for jwt
        const jwtSecret = process.env.JWT_SECRET;
        const jwtExpiresIn = Number(process.env.JWT_EXPIRES_IN) || 259200000;
        const signOptions = {
            expiresIn: jwtExpiresIn,
        };
        // 9 : sign token
        const token = jsonwebtoken_1.default.sign({ id: String(supplier._id) }, jwtSecret, signOptions);
        // 1 : once the user is created the otp document should be deleted
        await otp_model_1.OtpModel.findByIdAndDelete(otpDoc?._id);
        // 12 : return response
        return res.status(200).json({
            status: "success",
            message: "Supplier sign up success",
            data: {
                supplier,
                jwt: token,
            },
        });
    }
    catch (err) {
        return next(err);
    }
};
exports.verifySupplierUsingOtp = verifySupplierUsingOtp;
// FUNCTION
const getCurrSupplierOrCLient = async (req, res, next) => {
    try {
        // 1 : Get the token from Authorization header (format: "Bearer <token>")
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return next(new AppError_1.AppError("Authorization token is missing or invalid", 401));
        }
        // Extract the token string
        const token = authHeader.split(" ")[1];
        if (!token) {
            return next(new AppError_1.AppError("Token is not provided", 401));
        }
        // 2 : verify jwt
        const jwtSecret = process.env.JWT_SECRET;
        const decodedToken = jsonwebtoken_1.default.verify(token, jwtSecret);
        // 3 : get the supplier based on id in token
        const userId = decodedToken?.id;
        // 4 : get the user based on id
        const user = await auth_model_1.UserModel.findById(userId).select("-password");
        if (!user) {
            return next(new AppError_1.AppError("Supplier does not exists", 401));
        }
        //  : send response
        return res.status(200).json({
            status: "success",
            message: "User fetched successfully",
            data: {
                user,
            },
        });
    }
    catch (err) {
        return next(err);
    }
};
exports.getCurrSupplierOrCLient = getCurrSupplierOrCLient;
// FUNCTION
const signinSupplierOrClient = async (req, res, next) => {
    try {
        // 1 : check the email and password
        const { email, password } = req.body;
        if (!email || !password) {
            return next(new AppError_1.AppError("email or password missing", 400));
        }
        // 2 : check wether the user exists against that email
        const user = await auth_model_1.UserModel.findOne({
            email,
        }).select("+password");
        // 3 : compare the password
        const passwordCorrect = user?.password
            ? await bcrypt_1.default.compare(password, user?.password)
            : false;
        // 4 : check both user and passwords are correct or not
        if (!user || !passwordCorrect) {
            return next(new AppError_1.AppError("Wrong email or password", 401));
        }
        // 6 : sign a jwt, create a jwt
        const jwtSecret = process.env.JWT_SECRET;
        const jwtExpiresIn = Number(process.env.JWT_EXPIRES_IN) || 259200000;
        const signOptions = {
            expiresIn: jwtExpiresIn,
        };
        const token = jsonwebtoken_1.default.sign({ id: String(user._id) }, // always cast ObjectId to string
        jwtSecret, signOptions);
        // 7 : send the cookie
        res.cookie("jwt", token, {
            httpOnly: true, // prevents access from JavaScript (XSS protection)
            secure: process.env.NODE_ENV === "production", // only sent over HTTPS in production
            sameSite: "lax", // or "strict" / "none" depending on frontend/backend setup
            path: "/",
            maxAge: 3 * 24 * 60 * 60 * 1000, // in milliseconds
        });
        res.status(200).json({
            status: "success",
            data: {
                user,
                jwt: token,
            },
        });
    }
    catch (err) {
        return next(err);
    }
};
exports.signinSupplierOrClient = signinSupplierOrClient;
// FUNCTION this function sends an otp to email
const signupClient = async (req, res, next) => {
    try {
        // 1 : take the necessary data out
        const { firstName, lastName, email, password } = req.body;
        // 2 : check for missing required fields
        if (!firstName || !email || !password) {
            throw new AppError_1.AppError("Missing required field requiredFields=[firstName, email, password ]", 400);
        }
        // 3 : write logic to send an otp
        const otp = (0, generate_otp_1.generateOTP)();
        const result = await (0, email_1.sendMail)(email, Number(otp));
        if (!result?.success) {
            throw new AppError_1.AppError("Sending otp to email failed", 500);
        }
        // 5 : make a document in otp collection
        await otp_model_1.OtpModel.create({
            firstName,
            lastName: lastName || "",
            email,
            password,
            otp,
        });
        // 6 : send the response
        return res.status(200).json({
            status: "success",
            message: "Otp successfully sent to your email",
        });
    }
    catch (err) {
        return next(err);
    }
};
exports.signupClient = signupClient;
// FUNCTION
const verifyClientUsingOtp = async (req, res, next) => {
    try {
        // 1 : take otp out of request body
        let { otp } = req.body;
        // 2 : check if otp exists
        if (!otp) {
            throw new AppError_1.AppError("Otp not provided", 400);
        }
        // 3 : convert the otp into number
        otp = Number(otp);
        // 4 : find the document against the concerned otp
        const otpDoc = await otp_model_1.OtpModel.findOne({ otp });
        // 6 : check if otp is expired or invalid
        if (!otpDoc || otpDoc.expiresAt < new Date()) {
            await otp_model_1.OtpModel.findByIdAndDelete(otpDoc?._id);
            throw new AppError_1.AppError("OTP invalid or expired", 400);
        }
        // 7 : signup the client, create a document in user collection and send a jwt
        const { firstName, lastName, email, password } = otpDoc;
        let client = await auth_model_1.UserModel.create({
            firstName,
            lastName: lastName || "",
            email,
            password,
            userType: "client",
        });
        client = client.toObject();
        // 8 : preparation for jwt
        const jwtSecret = process.env.JWT_SECRET;
        const jwtExpiresIn = Number(process.env.JWT_EXPIRES_IN) || 259200000;
        const signOptions = {
            expiresIn: jwtExpiresIn,
        };
        // 9 : sign token
        const token = jsonwebtoken_1.default.sign({ id: String(client._id) }, jwtSecret, signOptions);
        // 1 : once the user is created the otp document should be deleted
        await otp_model_1.OtpModel.findByIdAndDelete(otpDoc?._id);
        // 12 : return response
        return res.status(200).json({
            status: "success",
            message: "Supplier sign up success",
            data: {
                client,
                jwt: token,
            },
        });
    }
    catch (err) {
        return next(err);
    }
};
exports.verifyClientUsingOtp = verifyClientUsingOtp;
// FUNCTION
const convertClientToSupplier = async (req, res, next) => {
    try {
        if (!req.body.companyName || !req.body.phoneNumber) {
            return next(new AppError_1.AppError("companyName and phoneNumber are required to convert client to supplier", 400));
        }
        const newSupplier = await auth_model_1.UserModel.findByIdAndUpdate(req.user?._id, {
            ...req.body,
            userType: "supplier",
            companyName: req.body.companyName,
            phoneNumber: req.body.phoneNumber,
        }, { new: true, returnDocument: "after", runValidators: true });
        res.status(200).json({
            status: "success",
            message: "Client to supplier conversion success",
            data: {
                newSupplier,
            },
        });
    }
    catch (err) {
        return next(err);
    }
};
exports.convertClientToSupplier = convertClientToSupplier;
// FUNCTION
const sendJwtGoogle = (req, res, next) => {
    try {
        const user = req.user;
        // create your own JWT
        // 8 : preparation for jwt
        const jwtSecret = process.env.JWT_SECRET;
        const jwtExpiresIn = Number(process.env.JWT_EXPIRES_IN) || 259200000;
        const signOptions = {
            expiresIn: jwtExpiresIn,
        };
        // 9 : sign token
        const token = jsonwebtoken_1.default.sign({ id: String(user._id) }, jwtSecret, signOptions);
        // send the user to your frontend
        return res.status(200).json({
            status: "success",
            message: "Supplier sign up success",
            data: {
                user,
                jwt: token,
            },
        });
    }
    catch (err) {
        return next(err);
    }
};
exports.sendJwtGoogle = sendJwtGoogle;
