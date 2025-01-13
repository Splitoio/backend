import { Router } from "express";
import { googleAuth } from "../controllers/auth.controller";
import { prisma } from "../lib/prisma";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

const router = Router();

router.post("/google", googleAuth);

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
