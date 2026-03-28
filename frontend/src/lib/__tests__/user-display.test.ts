import { describe, expect, it } from 'vitest';
import { getUserAvatarUrl, getUserDisplayName } from '../user-display';

describe('getUserDisplayName', () => {
  it('prefers profile.name from backend responses', () => {
    expect(
      getUserDisplayName({
        studentId: '20230001',
        profile: {
          name: '张三',
        },
      })
    ).toBe('张三');
  });

  it('falls back to legacy nickname when name is absent', () => {
    expect(
      getUserDisplayName({
        studentId: '20230001',
        nickname: '阿张',
      })
    ).toBe('阿张');
  });

  it('falls back to studentId and then default label', () => {
    expect(
      getUserDisplayName({
        studentId: '20230001',
      })
    ).toBe('20230001');

    expect(getUserDisplayName({}, '同学')).toBe('同学');
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
