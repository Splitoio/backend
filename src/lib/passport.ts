import passport from "passport";
import { Profile, Strategy as GoogleStrategy } from "passport-google-oauth20";
import { env } from "../config/env";
import { prisma } from "./prisma";

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL } = env;

passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID!,
      clientSecret: GOOGLE_CLIENT_SECRET!,
      callbackURL: GOOGLE_CALLBACK_URL!,
      scope: ['profile', 'email'],
      state: true
    },
    async (accessToken: string, refreshToken: string, profile: Profile, done) => {
      // Save or update user in your database
      // Example: await User.findOrCreate({ googleId: profile.id, name: profile.displayName });
      const user = await prisma.user.upsert({
        where: { email: profile.emails?.[0]?.value },
        update: {   },
        create: {
            // googleId: profile.id,
            email: profile.emails?.[0]?.value,
            name: profile.displayName
        }
    });
    console.log(user, profile);
    done(null, user);
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser(async (id: number, done) => {
  const user = await prisma.user.findUnique({ where: { id } });
  done(null, user);
});

export default passport;
