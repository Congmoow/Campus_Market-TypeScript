import request from 'supertest';
import app from '../app';
import { prisma } from '../utils/prisma.util';

const USER_TEST_PREFIX = 'userint';
const USER_PROFILE_TEST_ID = `${USER_TEST_PREFIX}30`;

describe('User API Integration Tests', () => {
  afterAll(async () => {
    await prisma.user.deleteMany({
      where: {
        studentId: {
          startsWith: USER_TEST_PREFIX,
        },
      },
    });
    await prisma.$disconnect();
  });

  it('persists editable profile fields through update and profile read', async () => {
    await request(app).post('/api/auth/register').send({
      studentId: USER_PROFILE_TEST_ID,
      password: 'password123',
      phone: '13800138030',
      name: 'Profile Test User',
    });

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        studentId: USER_PROFILE_TEST_ID,
        password: 'password123',
      })
      .expect(200);

    expect(loginResponse.body.success).toBe(true);
    expect(loginResponse.body.data).toEqual(
      expect.objectContaining({
        token: expect.any(String),
        user: expect.objectContaining({
          id: expect.any(Number),
          studentId: USER_PROFILE_TEST_ID,
        }),
      }),
    );

    const token = loginResponse.body.data.token as string;
    const userId = loginResponse.body.data.user.id as number;

    const updateResponse = await request(app)
      .put('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Profile Test User',
        major: 'Software Engineering',
        grade: '2023',
        campus: 'Zijingang',
        bio: 'Profile integration bio',
      })
      .expect(200);

    expect(updateResponse.body.success).toBe(true);
    expect(updateResponse.body.data).toEqual(
      expect.objectContaining({
        major: 'Software Engineering',
        grade: '2023',
        campus: 'Zijingang',
        bio: 'Profile integration bio',
      }),
    );

    const profileResponse = await request(app).get(`/api/users/${userId}`).expect(200);

    expect(profileResponse.body.success).toBe(true);
    expect(profileResponse.body.data).toEqual(
      expect.objectContaining({
        major: 'Software Engineering',
        grade: '2023',
        campus: 'Zijingang',
        bio: 'Profile integration bio',
      }),
    );
    expect(profileResponse.body.data.profile).toEqual(
      expect.objectContaining({
        major: 'Software Engineering',
        grade: '2023',
        campus: 'Zijingang',
        bio: 'Profile integration bio',
      }),
    );
  });
});
