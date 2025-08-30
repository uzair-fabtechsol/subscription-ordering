"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const passport_1 = __importDefault(require("passport"));
const passport_google_oauth20_1 = require("passport-google-oauth20");
const auth_model_1 = require("../models/auth-model");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
passport_1.default.use(new passport_google_oauth20_1.Strategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `http://localhost:4000/api/v1/users/google/callback`,
    passReqToCallback: true, // 👈 must be set if you want `req`
}, async (req, _accessToken, _refreshToken, profile, done) => {
    try {
        // 1 : get the user type
        const state = req.query.state;
        const stateArr = state.split(",");
        // try by googleId first
        let user = await auth_model_1.UserModel.findOne({ googleId: profile.id });
        // fallback by email (avoid duplicate accounts)
        const email = profile.emails?.[0]?.value;
        if (!user && email) {
            user = await auth_model_1.UserModel.findOne({ email });
        }
        if (!user) {
            user = await auth_model_1.UserModel.create({
                googleId: profile.id,
                email,
                name: profile.displayName,
                avatar: profile.photos?.[0]?.value,
                companyName: stateArr[0] === "userType=supplier"
                    ? stateArr[1].split("=")[1]
                    : "",
                phoneNumber: stateArr[0] === "userType=supplier"
                    ? stateArr[2].split("=")[1]
                    : "",
                userType: stateArr[0] === "userType=supplier" ? "supplier" : "client",
            });
        }
        else if (!user.googleId) {
            // link googleId to existing email account
            user.googleId = profile.id;
            await user.save();
        }
        return done(null, user);
    }
    catch (err) {
        return done(err, undefined);
    }
}));
exports.default = passport_1.default;
