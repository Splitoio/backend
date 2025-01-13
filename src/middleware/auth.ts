import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { env } from "../config/env";

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    res.status(401).json({ error: "Missing authentication token" });

    return;
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as { userId: number };
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      res.status(401).json({ error: "User not found" });

      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(403).json({ error: "Invalid token" });
  }
};
