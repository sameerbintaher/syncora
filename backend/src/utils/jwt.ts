import jwt, { SignOptions } from 'jsonwebtoken';
import { AppError } from './AppError';

export interface TokenPayload {
  sub: string;
  email: string;
  username: string;
  iat?: number;
  exp?: number;
}

const accessSecret = process.env.JWT_ACCESS_SECRET!;
const refreshSecret = process.env.JWT_REFRESH_SECRET!;

export function signAccessToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
  const options: SignOptions = {
    expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN as SignOptions['expiresIn']) || '15m',
  };
  return jwt.sign(payload, accessSecret, options);
}

export function signRefreshToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
  const options: SignOptions = {
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn']) || '7d',
  };
  return jwt.sign(payload, refreshSecret, options);
}

export function verifyAccessToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, accessSecret) as TokenPayload;
  } catch {
    throw new AppError('Invalid or expired access token', 401);
  }
}

export function verifyRefreshToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, refreshSecret) as TokenPayload;
  } catch {
    throw new AppError('Invalid or expired refresh token', 401);
  }
}
