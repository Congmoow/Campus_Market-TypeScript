import { describe, expect, it } from 'vitest';
import { getUserAvatarUrl, getUserDisplayName } from '../user-display';

describe('getUserDisplayName', () => {
  it('prefers profile.name from backend responses', () => {
    expect(
      getUserDisplayName({
        studentId: '20230001',
        profile: {
          name: '寮犱笁',
        },
      })
    ).toBe('寮犱笁');
  });

  it('falls back to top-level name when profile.name is absent', () => {
    expect(
      getUserDisplayName({
        studentId: '20230001',
        name: '闃垮紶',
      })
    ).toBe('闃垮紶');
  });

  it('falls back to studentId and then default label', () => {
    expect(
      getUserDisplayName({
        studentId: '20230001',
      })
    ).toBe('20230001');

    expect(getUserDisplayName({}, '鍚屽')).toBe('鍚屽');
  });
});

describe('getUserAvatarUrl', () => {
  it('falls back to nested profile.avatarUrl when top-level avatar fields are absent', () => {
    expect(
      getUserAvatarUrl({
        profile: {
          avatarUrl: '/uploads/avatars/new-avatar.png',
        },
      })
    ).toBe('/uploads/avatars/new-avatar.png');
  });
});
