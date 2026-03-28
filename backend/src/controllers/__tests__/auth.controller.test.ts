import { Request, Response, NextFunction } from 'express';
import { AuthController } from '../auth.controller';

jest.mock('../../services/auth.service', () => ({
  AuthService: jest.fn().mockImplementation(() => ({
    login: jest.fn().mockResolvedValue({
      token: 'token',
      user: {
        id: 1,
        studentId: '20240001',
        role: 'USER',
      },
    }),
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
});
