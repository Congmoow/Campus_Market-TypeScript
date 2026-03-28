import { UserService } from '../user.service';
import { prisma } from '../../utils/prisma.util';

jest.mock('../../utils/prisma.util', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    userProfile: {
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    product: {
      count: jest.fn(),
    },
  },
}));

describe('UserService', () => {
  let userService: UserService;

  beforeEach(() => {
    userService = new UserService();
    jest.clearAllMocks();
    (prisma.product.count as jest.Mock).mockResolvedValue(0);
  });

  describe('updateUserProfile', () => {
    it('persists and returns the editable personal-profile fields', async () => {
      const now = new Date('2026-03-28T08:00:00.000Z');
      const user = {
        id: BigInt(1),
        studentId: '20230001',
        phone: '13800000000',
        role: 'USER',
        createdAt: now,
        updatedAt: now,
      };
      const existingProfile = {
        id: BigInt(11),
        userId: BigInt(1),
        name: 'Old Name',
        studentId: '20230001',
        avatarUrl: '/old.png',
        major: 'Old Major',
        grade: '2022',
        campus: 'Old Campus',
        bio: 'Old bio',
        credit: 700,
        createdAt: now,
        updatedAt: now,
      };
      const updatedProfile = {
        ...existingProfile,
        name: 'New Name',
        avatarUrl: '/new.png',
        major: 'Software Engineering',
        grade: '2023',
        campus: 'Zijingang',
        bio: 'New bio',
        updatedAt: new Date('2026-03-28T09:00:00.000Z'),
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(user);
      (prisma.userProfile.findFirst as jest.Mock)
        .mockResolvedValueOnce(existingProfile)
        .mockResolvedValueOnce(updatedProfile);
      (prisma.user.update as jest.Mock).mockResolvedValue({
        ...user,
        phone: '13900000000',
      });
      (prisma.userProfile.update as jest.Mock).mockResolvedValue(updatedProfile);

      const result = await userService.updateUserProfile(1, {
        name: 'New Name',
        phone: '13900000000',
        bio: 'New bio',
        major: 'Software Engineering',
        grade: '2023',
        campus: 'Zijingang',
        avatarUrl: '/new.png',
      } as any);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
        data: expect.objectContaining({
          phone: '13900000000',
          updatedAt: expect.any(Date),
        }),
      });
      expect(prisma.userProfile.update).toHaveBeenCalledWith({
        where: { id: BigInt(11) },
        data: expect.objectContaining({
          name: 'New Name',
          bio: 'New bio',
          major: 'Software Engineering',
          grade: '2023',
          campus: 'Zijingang',
          avatarUrl: '/new.png',
          updatedAt: expect.any(Date),
        }),
      });
      expect(result).toEqual(
        expect.objectContaining({
          id: 1,
          studentId: '20230001',
          name: 'New Name',
          avatarUrl: '/new.png',
          major: 'Software Engineering',
          grade: '2023',
          campus: 'Zijingang',
          bio: 'New bio',
        })
      );
      expect(result.profile).toEqual(
        expect.objectContaining({
          name: 'New Name',
          nickname: 'New Name',
          phone: '13900000000',
          bio: 'New bio',
          location: 'Zijingang',
        })
      );
    });
  });
});
