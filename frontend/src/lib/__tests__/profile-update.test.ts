import { describe, expect, it } from 'vitest';
import { mergeUpdatedProfile } from '../profile-update';

describe('mergeUpdatedProfile', () => {
  it('keeps submitted text fields when backend responds with a partial profile payload', () => {
    const currentProfile = {
      id: 1,
      name: 'Old Name',
      studentId: '20230001',
      major: 'Old Major',
      grade: '2022',
      campus: 'Old Campus',
      bio: 'Old bio',
      profile: {
        name: 'Old Name',
        location: 'Old Campus',
      },
    };

    const submittedProfile = {
      name: 'New Name',
      studentId: '20230001',
      major: 'Software Engineering',
      grade: '2023',
      campus: 'Zijingang',
      bio: 'New bio',
      avatarUrl: '/uploads/avatar-new.png',
    };

    const responseProfile = {
      id: 1,
      studentId: '20230001',
      profile: {
        name: 'New Name',
        location: 'Zijingang',
        bio: 'New bio',
      },
    };

    expect(
      mergeUpdatedProfile(currentProfile, submittedProfile, responseProfile)
    ).toEqual(
      expect.objectContaining({
        name: 'New Name',
        major: 'Software Engineering',
        grade: '2023',
        campus: 'Zijingang',
        bio: 'New bio',
        avatarUrl: '/uploads/avatar-new.png',
      })
    );
  });
});
