import { User, IUserDocument, PublicUser } from '../models/User';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { AppError } from '../utils/AppError';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface AuthResult {
  user: PublicUser;
  tokens: AuthTokens;
}

export class AuthService {
  async register(username: string, email: string, password: string): Promise<AuthResult> {
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      const field = existingUser.email === email ? 'email' : 'username';
      throw new AppError(`An account with this ${field} already exists`, 409);
    }

    const user = await User.create({ name: username, username, email, password });
    const tokens = this.generateTokens(user);

    await this.persistRefreshToken(user, tokens.refreshToken);

    return { user: user.toPublicJSON(), tokens };
  }

  async login(email: string, password: string): Promise<AuthResult> {
    const user = await (User as any).findByEmail(email);
    if (!user) throw new AppError('Invalid credentials', 401);

    const isValid = await user.comparePassword(password);
    if (!isValid) throw new AppError('Invalid credentials', 401);

    const tokens = this.generateTokens(user);
    await this.persistRefreshToken(user, tokens.refreshToken);

    return { user: user.toPublicJSON(), tokens };
  }

  async refreshTokens(incomingRefreshToken: string): Promise<AuthTokens> {
    const payload = verifyRefreshToken(incomingRefreshToken);

    const user = await User.findById(payload.sub).select('+refreshTokens');
    if (!user) throw new AppError('User not found', 404);

    const tokenIndex = user.refreshTokens.indexOf(incomingRefreshToken);
    if (tokenIndex === -1) {
      // Token reuse detected — invalidate all tokens (rotation attack mitigation)
      user.refreshTokens = [];
      await user.save();
      throw new AppError('Refresh token reuse detected. Please log in again.', 401);
    }

    // Rotate: remove old, issue new
    user.refreshTokens.splice(tokenIndex, 1);
    const tokens = this.generateTokens(user);
    user.refreshTokens.push(tokens.refreshToken);
    await user.save();

    return tokens;
  }

  async logout(userId: string, refreshToken: string): Promise<void> {
    const user = await User.findById(userId).select('+refreshTokens');
    if (!user) return;

    user.refreshTokens = user.refreshTokens.filter((t) => t !== refreshToken);
    await user.save();
  }

  async logoutAll(userId: string): Promise<void> {
    await User.findByIdAndUpdate(userId, { refreshTokens: [] });
  }

  private generateTokens(user: IUserDocument): AuthTokens {
    const payload = {
      sub: user._id.toString(),
      email: user.email,
      username: user.username,
    };
    return {
      accessToken: signAccessToken(payload),
      refreshToken: signRefreshToken(payload),
    };
  }

  private async persistRefreshToken(user: IUserDocument, token: string): Promise<void> {
    // Keep max 5 active sessions per user
    const MAX_SESSIONS = 5;
    if (user.refreshTokens.length >= MAX_SESSIONS) {
      user.refreshTokens = user.refreshTokens.slice(-MAX_SESSIONS + 1);
    }
    user.refreshTokens.push(token);
    await user.save();
  }
}

export const authService = new AuthService();
