import { getUserAvatarUrl } from './user-display';

type LooseProfile = Record<string, any> | null | undefined;

export function mergeUpdatedProfile(
  currentProfile: LooseProfile,
  submittedProfile: LooseProfile,
  responseProfile: LooseProfile
) {
  const merged = {
    ...(currentProfile ?? {}),
    ...(responseProfile ?? {}),
    ...(submittedProfile ?? {}),
  } as Record<string, any>;

  const avatarUrl =
    getUserAvatarUrl(responseProfile) ||
    getUserAvatarUrl(submittedProfile) ||
    getUserAvatarUrl(currentProfile);

  merged.name = submittedProfile?.name ?? responseProfile?.name ?? currentProfile?.name;
  merged.studentId =
    submittedProfile?.studentId ?? responseProfile?.studentId ?? currentProfile?.studentId;
  merged.major = submittedProfile?.major ?? responseProfile?.major ?? currentProfile?.major;
  merged.grade = submittedProfile?.grade ?? responseProfile?.grade ?? currentProfile?.grade;
  merged.campus = submittedProfile?.campus ?? responseProfile?.campus ?? currentProfile?.campus;
  merged.bio = submittedProfile?.bio ?? responseProfile?.bio ?? currentProfile?.bio;

  if (avatarUrl) {
    merged.avatarUrl = avatarUrl;
  }

  merged.profile = {
    ...(currentProfile?.profile ?? {}),
    ...(responseProfile?.profile ?? {}),
    name:
      submittedProfile?.name ??
      responseProfile?.profile?.name ??
      responseProfile?.name ??
      currentProfile?.profile?.name,
    nickname:
      submittedProfile?.name ??
      responseProfile?.profile?.nickname ??
      responseProfile?.nickname ??
      currentProfile?.profile?.nickname,
    studentId:
      submittedProfile?.studentId ??
      responseProfile?.profile?.studentId ??
      responseProfile?.studentId ??
      currentProfile?.profile?.studentId,
    location:
      submittedProfile?.campus ??
      responseProfile?.profile?.location ??
      responseProfile?.campus ??
      currentProfile?.profile?.location,
    bio:
      submittedProfile?.bio ??
      responseProfile?.profile?.bio ??
      responseProfile?.bio ??
      currentProfile?.profile?.bio,
    major:
      submittedProfile?.major ??
      responseProfile?.profile?.major ??
      responseProfile?.major ??
      currentProfile?.profile?.major,
    grade:
      submittedProfile?.grade ??
      responseProfile?.profile?.grade ??
      responseProfile?.grade ??
      currentProfile?.profile?.grade,
    campus:
      submittedProfile?.campus ??
      responseProfile?.profile?.campus ??
      responseProfile?.campus ??
      currentProfile?.profile?.campus,
    avatarUrl,
  };

  return merged;
}
