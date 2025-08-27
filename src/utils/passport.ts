import passport from "passport";
import { Strategy as GoogleStrategy, Profile } from "passport-google-oauth20";
import { UserModel } from "../models/auth-model";

passport.use(
  new GoogleStrategy(
    {
      clientID:
        "760122510836-kdohu4q6dreqpindfd513gcbbi3lfmfr.apps.googleusercontent.com",
      clientSecret: "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",
      callbackURL: `http://localhost:4000/api/v1/users/google/callback`,
    },
    async (_accessToken, _refreshToken, profile: Profile, done) => {
      try {
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
            userType: "client",
          });
        } else if (!user.googleId) {
          // link googleId to existing email account
          user.googleId = profile.id;
          await user.save();
        }

        return done(null, user);
      } catch (err) {
        return done(err as any, undefined);
      }
    }
  )
);

export default passport;
