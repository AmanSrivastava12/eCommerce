import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { randomBytes, randomUUID } from 'crypto';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module';
import { Role } from '../common/roles.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

const RESET_TOKEN_TTL_SECONDS = 30 * 60;

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private notificationsService: NotificationsService,
    @Inject(REDIS_CLIENT) private redis: Redis,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const role = dto.role ?? Role.Customer;
    const user = await this.usersService.create({
      email: dto.email.toLowerCase(),
      passwordHash,
      name: dto.name,
      role,
      addresses: [],
      sellerProfile:
        role === Role.Seller
          ? {
              businessName: dto.businessName ?? dto.name,
              verificationStatus: 'pending',
              ratingSummary: {
                overall: { average: 0, count: 0 },
                productQuality: { average: 0, count: 0 },
                deliveryTimeliness: { average: 0, count: 0 },
                packaging: { average: 0, count: 0 },
              },
            }
          : null,
    });
    return this.issueTokens(String(user._id), user.email, user.role);
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmailWithPassword(dto.email);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const matches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!matches) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.issueTokens(String(user._id), user.email, user.role);
  }

  /**
   * Always resolves the same way whether or not the email exists, so this endpoint can't be
   * used to enumerate registered accounts. The reset link is only ever handed to
   * NotificationsService (logged by its stub processor, same as every other "email" in this
   * app) — never returned to the caller.
   */
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (user) {
      const token = randomBytes(32).toString('hex');
      await this.redis.set(`password-reset:${token}`, String(user._id), 'EX', RESET_TOKEN_TTL_SECONDS);
      const websiteUrl = this.configService.get<string>('WEBSITE_URL') ?? 'http://localhost:3001';
      await this.notificationsService.enqueue({
        type: 'password-reset',
        to: user.email,
        payload: {
          resetUrl: `${websiteUrl}/reset-password?token=${token}`,
          token,
          expiresInMinutes: RESET_TOKEN_TTL_SECONDS / 60,
        },
      });
    }
    return { message: 'If an account exists for that email, we have sent password reset instructions.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const userId = await this.redis.get(`password-reset:${dto.token}`);
    if (!userId) {
      throw new BadRequestException('This reset link is invalid or has expired.');
    }
    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.usersService.updatePasswordHash(userId, passwordHash);
    await this.redis.del(`password-reset:${dto.token}`);

    // Invalidate every existing session — a leaked/guessed old refresh token shouldn't
    // survive a password reset.
    const refreshKeys = await this.redis.keys(`refresh:${userId}:*`);
    if (refreshKeys.length > 0) await this.redis.del(...refreshKeys);

    return { message: 'Your password has been reset. You can now sign in with your new password.' };
  }

  async refresh(refreshToken: string) {
    let payload: { sub: string; email: string; role: string; jti: string };
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const stored = await this.redis.get(`refresh:${payload.sub}:${payload.jti}`);
    if (!stored) {
      throw new UnauthorizedException('Refresh token has been revoked or expired');
    }
    await this.redis.del(`refresh:${payload.sub}:${payload.jti}`);
    return this.issueTokens(payload.sub, payload.email, payload.role);
  }

  private async issueTokens(userId: string, email: string, role: string) {
    const jti = randomUUID();
    const accessToken = this.jwtService.sign(
      { sub: userId, email, role },
      {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m',
      } as any,
    );
    const refreshToken = this.jwtService.sign(
      { sub: userId, email, role, jti },
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d',
      } as any,
    );
    const ttlSeconds = 7 * 24 * 60 * 60;
    await this.redis.set(`refresh:${userId}:${jti}`, '1', 'EX', ttlSeconds);
    return { accessToken, refreshToken };
  }
}
