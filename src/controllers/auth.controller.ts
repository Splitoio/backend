import { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { env } from '../config/env';

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

export const googleAuth = async (req: Request, res: Response): Promise<void> => {
  const { token } = req.body;

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      res.status(400).json({ error: 'Invalid token' });
      return 
    }

    const { email, name, picture } = payload;

    let user = await prisma.user.findUnique({
      where: { email: email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: email!,
          name: name ?? email!.split('@')[0],
          image: picture,
          currency: 'USD',
        },
      });
    }

    const jwtToken = jwt.sign({ userId: user.id }, env.JWT_SECRET);
    res.json({ token: jwtToken, user });
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};
