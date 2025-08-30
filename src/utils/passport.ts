import passport from "passport";
import {
  Strategy as GoogleStrategy,
  Profile,
  VerifyCallback,
} from "passport-google-oauth20";
import { Request } from "express";
import { UserModel } from "../models/auth-model";
import dotenv from "dotenv";
import path from "path";
dotenv.config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: `http://localhost:4000/api/v1/users/google/callback`,
      passReqToCallback: true, // 👈 must be set if you want `req`
    },
    async (
      req: Request,
      _accessToken: string,
      _refreshToken: string,
      profile: Profile,
      done: VerifyCallback
    ) => {
      try {
        // 1 : get the user type
        const state = req.query.state as string;
        const stateArr = state.split(",");

        // try by googleId first
        let user = await UserModel.findOne({ googleId: profile.id }); 

        // fallback by email (avoid duplicate accounts)
        const email = profile.emails?.[0]?.value;
        if (!user && email) {
          user = await UserModel.findOne({ email });
        }

        if (!user) {
          user = await UserModel.create({
            googleId: profile.id,
            email,
            name: profile.displayName,
            avatar: profile.photos?.[0]?.value,
            companyName:
              stateArr[0] === "userType=supplier"
                ? stateArr[1].split("=")[1]
                : "",
            phoneNumber:
              stateArr[0] === "userType=supplier"
                ? stateArr[2].split("=")[1]
                : "",
            userType:
              stateArr[0] === "userType=supplier" ? "supplier" : "client",
          });
        } else if (!user.googleId) {
          // link googleId to existing email account
          user.googleId = profile.id;
          await user.save();
        }

        return done(null, user);
      } catch (err) {
        return done(err as Error, undefined);
      }
    }
  )
);

export default passport;
