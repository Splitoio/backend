import { Router } from "express";
import { googleAuth } from "../controllers/auth.controller";
import { prisma } from "../lib/prisma";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import express, { Request, Response } from "express";
import session from "express-session";
import passport from "../lib/passport"; 

const router = Router();

router.post("/google", googleAuth);

// Middleware for session
router.use(
  session({
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }, // Set `true` for production with HTTPS
  })
);

// Initialize Passport
router.use(passport.initialize());
router.use(passport.session());

// Google OAuth Routes
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    successRedirect: "http://localhost:3000",
    failureRedirect: "http://localhost:3000/login"
  })
);

// Logout Route
router.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).send("Error logging out");
    }
    res.redirect("/");
  });
});

// Protected API Route
router.get("/profile", (req: Request, res: Response) => {
  if (req.isAuthenticated()) {
    res.json(req.user);
  } else {
    res.status(401).json({ message: "Unauthorized" });
  }
});

if (process.env.NODE_ENV === "development") {
  router.post("/test-login", async (req, res) => {
    const { email } = req.body;

    try {
      let user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            email,
            name: email.split("@")[0],
            currency: "USD",
          },
        });
      }

      const token = jwt.sign({ userId: user.id }, env.JWT_SECRET);
      res.json({ token, user });
    } catch (error) {
      console.error("Test login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });
}

export const authRouter = router;
