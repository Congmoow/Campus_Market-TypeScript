type DisplayNameProfile = {
  name?: string | null;
  nickname?: string | null;
  studentId?: string | null;
};

type DisplayNameSource = {
  name?: string | null;
  nickname?: string | null;
  username?: string | null;
  studentId?: string | null;
  profile?: DisplayNameProfile | null;
} | null | undefined;

type AvatarProfile = {
  avatarUrl?: string | null;
  avatar?: string | null;
};

type AvatarSource = {
  avatarUrl?: string | null;
  avatar?: string | null;
  profile?: AvatarProfile | null;
} | null | undefined;

const normalizeValue = (value?: string | null): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export function getUserDisplayName(
  source: DisplayNameSource,
  fallback = '同学'
): string {
  return (
    normalizeValue(source?.profile?.name) ||
    normalizeValue(source?.name) ||
    normalizeValue(source?.profile?.nickname) ||
    normalizeValue(source?.nickname) ||
    normalizeValue(source?.profile?.studentId) ||
    normalizeValue(source?.studentId) ||
    normalizeValue(source?.username) ||
    fallback
  );
}

export function getUserAvatarUrl(
  source: AvatarSource,
  fallback?: string
): string | undefined {
  return (
    normalizeValue(source?.avatarUrl) ||
    normalizeValue(source?.avatar) ||
    normalizeValue(source?.profile?.avatarUrl) ||
    normalizeValue(source?.profile?.avatar) ||
    fallback
  );
}
