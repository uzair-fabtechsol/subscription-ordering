import passport from "passport";
import {
  Strategy as GoogleStrategy,
  Profile,
  VerifyCallback,
} from "passport-google-oauth20";
import { Request } from "express";
import { UserModel } from "../models/auth-model";

passport.use(
  new GoogleStrategy(
    {
      clientID:
        "760122510836-kdohu4q6dreqpindfd513gcbbi3lfmfr.apps.googleusercontent.com",
      clientSecret: "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",
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
        const userType = (req.query.state as string) || "client";

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
            userType, // 👈 now included
            companyName: "Google Supplier",
            phoneNumber: "0000000000",
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
