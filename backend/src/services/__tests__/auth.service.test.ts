import { AuthService } from '../auth.service';
import { prisma } from '../../utils/prisma.util';
import { hashPassword, comparePassword } from '../../utils/password.util';
import { generateToken } from '../../utils/jwt.util';
import { generateRefreshToken, hashRefreshToken } from '../../utils/refresh-token.util';
import {
  BusinessException,
  UnauthorizedException,
  ValidationException,
} from '../../utils/error.util';

jest.mock('../../utils/prisma.util', () => ({
  prisma: {
    $transaction: jest.fn(),
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    refreshSession: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    userProfile: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock('../../utils/password.util');
jest.mock('../../utils/jwt.util');
jest.mock(
  '../../utils/refresh-token.util',
  () => ({
    generateRefreshToken: jest.fn(),
    hashRefreshToken: jest.fn(),
  }),
  { virtual: true },
);

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('registers a new user with studentId credentials', async () => {
      const registerData = {
        studentId: '20240001',
        password: 'password123',
        phone: '13800138000',
        name: 'Test User',
      };

      const mockUser = {
        id: BigInt(1),
        studentId: '20240001',
        passwordHash: 'hashedpassword',
        phone: '13800138000',
        role: 'USER',
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockProfile = {
        id: BigInt(1),
        userId: BigInt(1),
        name: 'Test User',
        studentId: '20240001',
        credit: 700,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const txUserCreate = jest.fn().mockResolvedValue(mockUser);
      const txProfileCreate = jest.fn().mockResolvedValue(mockProfile);

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.$transaction as jest.Mock).mockImplementation(async (callback: any) =>
        callback({
          user: {
            create: txUserCreate,
          },
          userProfile: {
            create: txProfileCreate,
          },
        }),
      );
      (hashPassword as jest.Mock).mockResolvedValue('hashedpassword');
      (generateToken as jest.Mock).mockReturnValue('mock-jwt-token');

      (generateRefreshToken as jest.Mock).mockReturnValue('mock-refresh-token');
      (hashRefreshToken as jest.Mock).mockReturnValue('mock-refresh-token-hash');
      (prisma.refreshSession.create as jest.Mock).mockResolvedValue({});

      const result = await authService.register(registerData, {
        userAgent: 'jest-agent',
        ipAddress: '127.0.0.1',
      });

      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.refreshToken).toBe('mock-refresh-token');
      expect(result.user.studentId).toBe('20240001');
      expect(result.user.phone).toBe('13800138000');
      expect(result.user.profile?.name).toBe('Test User');
      expect(generateToken).toHaveBeenCalledWith(
        expect.objectContaining({
          phone: '13800138000',
        }),
      );
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { studentId: '20240001' },
      });
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.refreshSession.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: BigInt(1),
          tokenHash: 'mock-refresh-token-hash',
          userAgent: 'jest-agent',
          ipAddress: '127.0.0.1',
        }),
      });
      expect(txUserCreate).toHaveBeenCalledTimes(1);
      expect(txProfileCreate).toHaveBeenCalledTimes(1);
      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(prisma.userProfile.create).not.toHaveBeenCalled();
    });

    it('throws if studentId already exists', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: BigInt(1),
        studentId: '20240001',
      });

      await expect(
        authService.register({
          studentId: '20240001',
          password: 'password123',
          name: 'Existing User',
        }),
      ).rejects.toThrow(BusinessException);
    });

    it('throws if phone already exists', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({
        id: BigInt(2),
        phone: '13800138000',
      });

      await expect(
        authService.register({
          studentId: '20240001',
          password: 'password123',
          phone: '13800138000',
          name: 'Phone Exists',
        }),
      ).rejects.toThrow(BusinessException);
    });

    it('maps unique constraint conflicts to a business exception', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      (hashPassword as jest.Mock).mockResolvedValue('hashedpassword');
      (prisma.$transaction as jest.Mock).mockRejectedValue({
        code: 'P2002',
        meta: {
          target: ['phone'],
        },
      });

      await expect(
        authService.register({
          studentId: '20240001',
          password: 'password123',
          phone: '13800138000',
          name: 'Race User',
        }),
      ).rejects.toThrow(BusinessException);
    });

    it('throws validation error for empty studentId', async () => {
      await expect(
        authService.register({
          studentId: '',
          password: 'password123',
          name: 'Test User',
        }),
      ).rejects.toThrow(ValidationException);
    });

    it('throws validation error for short password', async () => {
      await expect(
        authService.register({
          studentId: '20240001',
          password: '12345',
          name: 'Test User',
        }),
      ).rejects.toThrow(ValidationException);
    });

    it('throws validation error for invalid phone', async () => {
      await expect(
        authService.register({
          studentId: '20240001',
          password: 'password123',
          phone: '12345',
          name: 'Test User',
        }),
      ).rejects.toThrow(ValidationException);
    });
  });

  describe('login', () => {
    it('logs in with valid studentId and password', async () => {
      const mockUser = {
        id: BigInt(1),
        studentId: '20240001',
        passwordHash: 'hashedpassword',
        enabled: true,
        phone: '13800138000',
        role: 'USER',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockProfile = {
        id: BigInt(1),
        userId: BigInt(1),
        name: 'Test User',
        studentId: '20240001',
      };

      (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (comparePassword as jest.Mock).mockResolvedValue(true);
      (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue(mockProfile);
      (generateToken as jest.Mock).mockReturnValue('mock-jwt-token');

      (generateRefreshToken as jest.Mock).mockReturnValue('mock-refresh-token');
      (hashRefreshToken as jest.Mock).mockReturnValue('mock-refresh-token-hash');
      (prisma.refreshSession.create as jest.Mock).mockResolvedValue({});

      const result = await authService.login(
        {
          studentId: '20240001',
          password: 'password123',
        },
        {
          userAgent: 'jest-agent',
          ipAddress: '127.0.0.1',
        },
      );

      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.refreshToken).toBe('mock-refresh-token');
      expect(result.user.studentId).toBe('20240001');
      expect(result.user.profile?.name).toBe('Test User');
      expect(prisma.userProfile.findUnique).toHaveBeenCalledWith({
        where: { userId: BigInt(1) },
      });
    });

    it('throws for non-existent user', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        authService.login({
          studentId: '20240001',
          password: 'password123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws for disabled user', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({
        id: BigInt(1),
        studentId: '20240001',
        passwordHash: 'hashedpassword',
        enabled: false,
      });

      await expect(
        authService.login({
          studentId: '20240001',
          password: 'password123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws for incorrect password', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({
        id: BigInt(1),
        studentId: '20240001',
        passwordHash: 'hashedpassword',
        enabled: true,
      });
      (comparePassword as jest.Mock).mockResolvedValue(false);

      await expect(
        authService.login({
          studentId: '20240001',
          password: 'wrongpassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('refreshes an active session and rotates the refresh token', async () => {
      const now = new Date('2026-04-02T00:00:00.000Z');
      jest.useFakeTimers().setSystemTime(now);

      (hashRefreshToken as jest.Mock)
        .mockReturnValueOnce('current-refresh-hash')
        .mockReturnValueOnce('next-refresh-hash');
      (generateRefreshToken as jest.Mock).mockReturnValue('next-refresh-token');
      (generateToken as jest.Mock).mockReturnValue('next-access-token');
      (prisma.refreshSession.findUnique as jest.Mock).mockResolvedValue({
        id: BigInt(10),
        userId: BigInt(1),
        tokenHash: 'current-refresh-hash',
        expiresAt: new Date('2026-04-09T00:00:00.000Z'),
        revokedAt: null,
      });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: BigInt(1),
        studentId: '20240001',
        passwordHash: 'hashedpassword',
        enabled: true,
        phone: '13800138000',
        role: 'USER',
        createdAt: now,
        updatedAt: now,
      });
      (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue({
        id: BigInt(1),
        userId: BigInt(1),
        name: 'Test User',
        studentId: '20240001',
      });
      (prisma.$transaction as jest.Mock).mockImplementation(async (callback: any) =>
        callback({
          refreshSession: {
            update: jest.fn().mockResolvedValue({}),
            create: jest.fn().mockResolvedValue({}),
          },
        }),
      );

      const result = await authService.refresh('current-refresh-token', {
        userAgent: 'jest-agent',
        ipAddress: '127.0.0.1',
      });

      expect(result.accessToken).toBe('next-access-token');
      expect(result.refreshToken).toBe('next-refresh-token');
      expect(prisma.refreshSession.findUnique).toHaveBeenCalledWith({
        where: { tokenHash: 'current-refresh-hash' },
      });

      jest.useRealTimers();
    });

    it('rejects refresh when the cookie token is missing or invalid', async () => {
      await expect(authService.refresh('')).rejects.toThrow(UnauthorizedException);

      (hashRefreshToken as jest.Mock).mockReturnValue('missing-refresh-hash');
      (prisma.refreshSession.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(authService.refresh('missing-refresh-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('revokes the current refresh session on logout', async () => {
      (hashRefreshToken as jest.Mock).mockReturnValue('logout-refresh-hash');
      (prisma.refreshSession.findUnique as jest.Mock).mockResolvedValue({
        id: BigInt(88),
        userId: BigInt(1),
        tokenHash: 'logout-refresh-hash',
        revokedAt: null,
      });
      (prisma.refreshSession.update as jest.Mock).mockResolvedValue({});

      await authService.logout('logout-refresh-token');

      expect(prisma.refreshSession.update).toHaveBeenCalledWith({
        where: { tokenHash: 'logout-refresh-hash' },
        data: expect.objectContaining({
          revokedAt: expect.any(Date),
        }),
      });
    });
  });

  describe('getCurrentUser', () => {
    it('returns current user info', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: BigInt(1),
        studentId: '20240001',
        phone: '13800138000',
        role: 'USER',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue({
        id: BigInt(1),
        userId: BigInt(1),
        name: 'Test User',
        studentId: '20240001',
      });

      const result = await authService.getCurrentUser(1);

      expect(result.id).toBe(1);
      expect(result.studentId).toBe('20240001');
      expect(result.profile?.name).toBe('Test User');
      expect(prisma.userProfile.findUnique).toHaveBeenCalledWith({
        where: { userId: BigInt(1) },
      });
    });

    it('throws if user is not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(authService.getCurrentUser(999)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('resetPassword', () => {
    it('resets password successfully', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: BigInt(1),
        studentId: '20240001',
        passwordHash: 'oldhashedpassword',
      });
      (comparePassword as jest.Mock).mockResolvedValue(true);
      (hashPassword as jest.Mock).mockResolvedValue('newhashedpassword');
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      await authService.resetPassword(1, {
        oldPassword: 'oldpassword',
        newPassword: 'newpassword123',
      });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
        data: expect.objectContaining({
          passwordHash: 'newhashedpassword',
        }),
      });
    });

    it('throws for incorrect old password', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: BigInt(1),
        studentId: '20240001',
        passwordHash: 'oldhashedpassword',
      });
      (comparePassword as jest.Mock).mockResolvedValue(false);

      await expect(
        authService.resetPassword(1, {
          oldPassword: 'wrongpassword',
          newPassword: 'newpassword123',
        }),
      ).rejects.toThrow(BusinessException);
    });

    it('throws validation error for short new password', async () => {
      await expect(
        authService.resetPassword(1, {
          oldPassword: 'oldpassword',
          newPassword: '12345',
        }),
      ).rejects.toThrow(ValidationException);
    });
  });
});
