import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import EditProfileModal from '../EditProfileModal';

vi.mock('../../api', () => ({
  userApi: {
    updateProfile: vi.fn(),
  },
  fileApi: {
    uploadImage: vi.fn(),
  },
}));

describe('EditProfileModal', () => {
  it('prefills editable fields from nested profile data', async () => {
    render(
      <EditProfileModal
        isOpen
        onClose={vi.fn()}
        currentProfile={
          {
            name: 'Seller',
            studentId: '20230002',
            profile: {
              major: 'Software Engineering',
              grade: '2023',
              campus: 'Zijingang',
              bio: 'Seller bio',
              avatarUrl: '/uploads/avatar.png',
            },
          } as any
        }
      />
    );

    expect(screen.getByDisplayValue('Software Engineering')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2023')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Zijingang')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Seller bio')).toBeInTheDocument();
  });
});
