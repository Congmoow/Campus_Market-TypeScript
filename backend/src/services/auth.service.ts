import type { User as PrismaUser, UserProfile as PrismaUserProfile } from '@prisma/client';
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
  User,
} from '@campus-market/shared';
import { prisma } from '../utils/prisma.util';
import { mapUser } from '../mappers/shared.mapper';
import { hashPassword, comparePassword } from '../utils/password.util';
import { generateToken } from '../utils/jwt.util';
import {
  BusinessException,
  UnauthorizedException,
  ValidationException,
} from '../utils/error.util';

type UniqueConstraintError = {
  code?: string;
  meta?: {
    target?: string[] | string;
  };
};

export class AuthService {
  async register(data: RegisterRequest): Promise<AuthResponse> {
    this.validateRegisterData(data);

    const existingUser = await prisma.user.findUnique({
      where: { studentId: data.studentId },
    });

    if (existingUser) {
      throw new BusinessException('学号已存在');
    }

    if (data.phone) {
      const existingPhoneUser = await prisma.user.findFirst({
        where: { phone: data.phone },
      });

      if (existingPhoneUser) {
        throw new BusinessException('手机号已被注册');
      }
    }

    const hashedPassword = await hashPassword(data.password);

    try {
      const { user, profile } = await prisma.$transaction(
        async (tx) => {
          const now = new Date();
          const user = await tx.user.create({
            data: {
              studentId: data.studentId,
              passwordHash: hashedPassword,
              phone: data.phone || null,
              role: 'USER',
              enabled: true,
              createdAt: now,
              updatedAt: now,
            },
          });

          const profile = await tx.userProfile.create({
            data: {
              userId: user.id,
              name: data.name || data.studentId,
              studentId: data.studentId,
              credit: 700,
              createdAt: now,
              updatedAt: now,
            },
          });

          return { user, profile };
        }
      );

      const token = generateToken({
        id: Number(user.id),
        studentId: user.studentId,
        phone: user.phone || undefined,
        role: user.role,
      });

      return {
        token,
        user: this.formatUserResponse(user, profile),
      };
    } catch (error) {
      this.throwIfUniqueConstraint(error);
      throw error;
    }
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    if (!data.studentId || !data.password) {
      throw new ValidationException('学号和密码不能为空');
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ studentId: data.studentId }, { phone: data.studentId }],
      },
    });

    if (!user) {
      throw new UnauthorizedException('学号或密码错误');
    }

    if (!user.enabled) {
      throw new UnauthorizedException('账户已被禁用');
    }

    const isPasswordValid = await comparePassword(data.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('学号或密码错误');
    }

    const profile = await prisma.userProfile.findUnique({
      where: { userId: user.id },
    });

    const token = generateToken({
      id: Number(user.id),
      studentId: user.studentId,
      phone: user.phone || undefined,
      role: user.role,
    });

    return {
      token,
      user: this.formatUserResponse(user, profile),
    };
  }

  async getCurrentUser(userId: number): Promise<User> {
    const user = await prisma.user.findUnique({
      where: { id: BigInt(userId) },
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    const profile = await prisma.userProfile.findUnique({
      where: { userId: user.id },
    });

    return this.formatUserResponse(user, profile);
  }

  async resetPassword(userId: number, data: ResetPasswordRequest): Promise<void> {
    if (!data.oldPassword || !data.newPassword) {
      throw new ValidationException('旧密码和新密码不能为空');
    }

    if (data.newPassword.length < 6) {
      throw new ValidationException('新密码长度不能少于 6 位');
    }

    const user = await prisma.user.findUnique({
      where: { id: BigInt(userId) },
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    const isOldPasswordValid = await comparePassword(
      data.oldPassword,
      user.passwordHash
    );

    if (!isOldPasswordValid) {
      throw new BusinessException('旧密码错误');
    }

    const hashedPassword = await hashPassword(data.newPassword);

    await prisma.user.update({
      where: { id: BigInt(userId) },
      data: {
        passwordHash: hashedPassword,
        updatedAt: new Date(),
      },
    });
  }

  private validateRegisterData(data: RegisterRequest): void {
    if (!data.studentId || data.studentId.trim().length === 0) {
      throw new ValidationException('学号不能为空');
    }

    if (data.studentId.length < 8 || data.studentId.length > 20) {
      throw new ValidationException('学号长度必须在 8 到 20 个字符之间');
    }

    if (!data.password || data.password.length < 6) {
      throw new ValidationException('密码长度不能少于 6 位');
    }

    if (data.phone && !/^1[3-9]\d{9}$/.test(data.phone)) {
      throw new ValidationException('手机号格式不正确');
    }
  }

  private throwIfUniqueConstraint(error: unknown): void {
    const candidate = error as UniqueConstraintError;
    if (candidate?.code !== 'P2002') {
      return;
    }

    const target = Array.isArray(candidate.meta?.target)
      ? candidate.meta.target
      : typeof candidate.meta?.target === 'string'
        ? [candidate.meta.target]
        : [];

    if (target.includes('phone')) {
      throw new BusinessException('手机号已被注册');
    }

    if (target.includes('studentId') || target.includes('student_id')) {
      throw new BusinessException('学号已存在');
    }
  }

  private formatUserResponse(
    user: PrismaUser,
    profile?: PrismaUserProfile | null
  ): User {
    return mapUser(user, profile);
  }
}
