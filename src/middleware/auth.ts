import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../lib/auth";
import { setCookieCache } from "better-auth/*";

export const getSession = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  if (!session) {
    res.status(401).json({ error: "Missing session" });

    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    res.status(401).json({ error: "User not found" });

    return;
  }

  req.user = user;
  next();
};
