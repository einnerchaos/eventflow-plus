import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../common/database/prisma.service';
import { User, UserRole } from '@prisma/client';

export interface JwtPayload {
  sub: string; // user id
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    role: UserRole;
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // ==========================================
  // JWT AUTHENTICATION
  // ==========================================

  /**
   * Validate user credentials for local strategy
   */
  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return null;
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    
    if (isPasswordValid) {
      // Update last login
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
      return user;
    }

    return null;
  }

  /**
   * Login user and return tokens
   */
  async login(user: User, ipAddress?: string, userAgent?: string): Promise<TokenResponse> {
    const tokens = await this.generateTokens(user);
    
    // Store refresh token
    await this.prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + this.getRefreshTokenExpiryMs()),
        ipAddress,
        userAgent,
      },
    });

    this.logger.log(`User ${user.email} logged in successfully`);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }

  /**
   * Refresh access token
   */
  async refreshTokens(refreshToken: string): Promise<TokenResponse> {
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!tokenRecord || tokenRecord.revoked) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (new Date() > tokenRecord.expiresAt) {
      throw new UnauthorizedException('Refresh token expired');
    }

    const user = tokenRecord.user;
    
    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Revoke old refresh token
    await this.prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { revoked: true, revokedAt: new Date() },
    });

    // Generate new tokens
    const tokens = await this.generateTokens(user);
    
    // Store new refresh token
    await this.prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + this.getRefreshTokenExpiryMs()),
      },
    });

    this.logger.log(`Tokens refreshed for user ${user.email}`);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }

  /**
   * Logout user (revoke refresh token)
   */
  async logout(refreshToken: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { token: refreshToken },
      data: { revoked: true, revokedAt: new Date() },
    });
    
    this.logger.log('User logged out, refresh token revoked');
  }

  /**
   * Validate JWT payload
   */
  async validateJwtPayload(payload: JwtPayload): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.isActive) {
      return null;
    }

    return user;
  }

  // ==========================================
  // API KEY AUTHENTICATION
  // ==========================================

  /**
   * Validate API key for source authentication
   */
  async validateApiKey(apiKey: string): Promise<{ sourceId: string } | null> {
    // API keys are stored as: apiKey + salt -> hashed
    // We need to find the source by trying to match the hash
    
    const sources = await this.prisma.appSource.findMany({
      where: { isActive: true },
      select: { id: true, apiKey: true, apiKeySalt: true },
    });

    for (const source of sources) {
      // In a real implementation, you'd use a constant-time comparison
      // For simplicity, we compare the provided key with stored key
      // (In production, you might want to hash and compare)
      if (await this.compareApiKey(apiKey, source.apiKey, source.apiKeySalt)) {
        return { sourceId: source.id };
      }
    }

    return null;
  }

  /**
   * Generate a new API key for a source
   */
  async generateApiKey(sourceId: string, regenerate: boolean = false): Promise<{ apiKey: string; displayKey: string }> {
    const existingSource = await this.prisma.appSource.findUnique({
      where: { id: sourceId },
    });

    if (!existingSource) {
      throw new BadRequestException('Source not found');
    }

    // Generate API key: ef_{random}_{timestamp}
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const apiKey = `ef_${random}_${timestamp}`;
    
    // Hash the API key for storage
    const salt = await this.generateApiKeySalt();
    const hashedKey = await this.hashApiKey(apiKey, salt);

    if (regenerate) {
      await this.prisma.appSource.update({
        where: { id: sourceId },
        data: {
          apiKey: hashedKey,
          apiKeySalt: salt,
        },
      });
    }

    // Return full key (only shown once)
    // Display key shows only first 8 and last 4 characters
    const displayKey = `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`;

    this.logger.log(`API key ${regenerate ? 'regenerated' : 'generated'} for source: ${sourceId}`);

    return { apiKey, displayKey };
  }

  // ==========================================
  // USER MANAGEMENT
  // ==========================================

  /**
   * Create initial admin user (for setup)
   */
  async createInitialAdmin(email: string, password: string): Promise<User> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const passwordHash = await this.hashPassword(password);

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        role: UserRole.ADMIN,
        isActive: true,
      },
    });

    this.logger.log(`Initial admin user created: ${email}`);
    return user;
  }

  // ==========================================
  // PRIVATE HELPERS
  // ==========================================

  private async generateTokens(user: User): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('jwt.secret') as string,
      expiresIn: this.configService.get('jwt.expiresIn', '1d') as string,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('jwt.refreshSecret') as string,
      expiresIn: this.configService.get('jwt.refreshExpiresIn', '7d') as string,
    });

    // Parse expiresIn to get numeric value
    const expiresIn = this.parseExpiryToSeconds(
      this.configService.get('jwt.expiresIn', '1d') as string,
    );

    return { accessToken, refreshToken, expiresIn };
  }

  private async hashPassword(password: string): Promise<string> {
    const rounds = this.configService.get('security.bcryptRounds', 10) as number;
    return bcrypt.hash(password, rounds);
  }

  private async generateApiKeySalt(): Promise<string> {
    return bcrypt.genSalt(10);
  }

  private async hashApiKey(apiKey: string, salt: string): Promise<string> {
    return bcrypt.hash(apiKey, salt);
  }

  private async compareApiKey(providedKey: string, storedHash: string, salt: string): Promise<boolean> {
    // In production, you'd use a more secure comparison
    // This is a simplified version
    return bcrypt.compare(providedKey, storedHash);
  }

  private getRefreshTokenExpiryMs(): number {
    const expiresIn = this.configService.get('jwt.refreshExpiresIn', '7d') as string;
    return this.parseExpiryToMs(expiresIn);
  }

  private parseExpiryToMs(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 7 * 24 * 60 * 60 * 1000; // Default 7 days
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return value * (multipliers[unit] || 1000);
  }

  private parseExpiryToSeconds(expiresIn: string): number {
    return this.parseExpiryToMs(expiresIn) / 1000;
  }
}
