import { Request, Response, NextFunction } from 'express';
import { AuthController } from '../auth.controller';

const login = jest.fn().mockResolvedValue({
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  user: {
    id: 1,
    studentId: '20240001',
    role: 'USER',
  },
});
const register = jest.fn().mockResolvedValue({
  accessToken: 'register-access-token',
  refreshToken: 'register-refresh-token',
  user: {
    id: 2,
    studentId: '20240002',
    role: 'USER',
  },
});
const refresh = jest.fn().mockResolvedValue({
  accessToken: 'rotated-access-token',
  refreshToken: 'rotated-refresh-token',
});
const logout = jest.fn().mockResolvedValue(undefined);

jest.mock('../../services/auth.service', () => ({
  AuthService: jest.fn().mockImplementation(() => ({
    login,
    register,
    refresh,
    logout,
  })),
}));

describe('AuthController', () => {
  let controller: AuthController;
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    controller = new AuthController();
    req = {
      body: {
        studentId: '20240001',
        password: 'password123',
      },
      headers: {
        'content-type': 'application/json',
      },
      url: '/login',
    };
    res = {
      json: jest.fn(),
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  it('does not log sensitive login payloads on success', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await controller.login(req as Request, res as Response, next);

    expect(logSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();

    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('sets the refresh token cookie on login success and only returns the access token in JSON', async () => {
    await controller.login(req as Request, res as Response, next);

    expect(login).toHaveBeenCalledWith(
      req.body,
      expect.objectContaining({
        userAgent: undefined,
        ipAddress: undefined,
      }),
    );
    expect(res.cookie).toHaveBeenCalledWith(
      'refreshToken',
      'refresh-token',
      expect.objectContaining({
        httpOnly: true,
        path: '/api/auth',
      }),
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: {
          token: 'access-token',
          user: {
            id: 1,
            studentId: '20240001',
            role: 'USER',
          },
        },
      }),
    );
  });

  it('rotates the refresh cookie on refresh success', async () => {
    req = {
      headers: {
        cookie: 'refreshToken=refresh-cookie-token',
        'user-agent': 'jest-agent',
      },
      ip: '127.0.0.1',
    };

    await controller.refresh(req as Request, res as Response, next);

    expect(refresh).toHaveBeenCalledWith('refresh-cookie-token', {
      userAgent: 'jest-agent',
      ipAddress: '127.0.0.1',
    });
    expect(res.cookie).toHaveBeenCalledWith(
      'refreshToken',
      'rotated-refresh-token',
      expect.objectContaining({
        httpOnly: true,
        path: '/api/auth',
      }),
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: {
          token: 'rotated-access-token',
        },
      }),
    );
  });

  it('clears the refresh cookie on logout', async () => {
    req = {
      headers: {
        cookie: 'refreshToken=refresh-cookie-token',
      },
    };

    await controller.logout(req as Request, res as Response, next);

    expect(logout).toHaveBeenCalledWith('refresh-cookie-token');
    expect(res.clearCookie).toHaveBeenCalledWith(
      'refreshToken',
      expect.objectContaining({
        httpOnly: true,
        path: '/api/auth',
      }),
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
      }),
    );
  });
});
