import { Request, Response, NextFunction } from 'express';
import { authenticate, optionalAuthenticate } from '../auth.middleware';
import { verifyToken } from '../../utils/jwt.util';
import { UnauthorizedException } from '../../utils/error.util';

// Mock JWT util
jest.mock('../../utils/jwt.util');

describe('Auth Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };
    mockResponse = {};
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('authenticate', () => {
    it('should authenticate valid token', () => {
      const mockPayload = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
      };

      mockRequest.headers = {
        authorization: 'Bearer valid-token',
      };

      (verifyToken as jest.Mock).mockReturnValue(mockPayload);

      authenticate(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(verifyToken).toHaveBeenCalledWith('valid-token');
      expect(mockRequest.user).toEqual(mockPayload);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should reject request without authorization header', () => {
      mockRequest.headers = {};

      authenticate(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(UnauthorizedException)
      );
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error.message).toContain('未提供认证令牌');
    });

    it('should reject malformed authorization header', () => {
      mockRequest.headers = {
        authorization: 'InvalidFormat',
      };

      authenticate(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(UnauthorizedException)
      );
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error.message).toContain('认证令牌格式错误');
    });

    it('should reject invalid token', () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token',
      };

      (verifyToken as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      authenticate(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(UnauthorizedException)
      );
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error.message).toContain('认证令牌无效或已过期');
    });

    it('should reject token without Bearer prefix', () => {
      mockRequest.headers = {
        authorization: 'token-without-bearer',
      };

      authenticate(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(UnauthorizedException)
      );
    });
  });

  describe('optionalAuthenticate', () => {
    it('should authenticate valid token', () => {
      const mockPayload = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
      };

      mockRequest.headers = {
        authorization: 'Bearer valid-token',
      };

      (verifyToken as jest.Mock).mockReturnValue(mockPayload);

      optionalAuthenticate(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(verifyToken).toHaveBeenCalledWith('valid-token');
      expect(mockRequest.user).toEqual(mockPayload);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should continue without token', () => {
      mockRequest.headers = {};

      optionalAuthenticate(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should continue with invalid token', () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token',
      };

      (verifyToken as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      optionalAuthenticate(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should continue with malformed authorization header', () => {
      mockRequest.headers = {
        authorization: 'InvalidFormat',
      };

      optionalAuthenticate(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalledWith();
    });
  });
});
