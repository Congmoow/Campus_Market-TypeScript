import { getUserAvatarUrl } from './user-display';

export type ProfileFields = {
  name?: string;
  studentId?: string;
  major?: string;
  grade?: string;
  campus?: string;
  bio?: string;
  avatarUrl?: string;
};

export type ProfileContainer = ProfileFields & {
  profile?: Partial<ProfileFields>;
};

type LooseProfile = ProfileContainer | null | undefined;

export function mergeUpdatedProfile(
  currentProfile: LooseProfile,
  submittedProfile: LooseProfile,
  responseProfile: LooseProfile,
) {
  const merged: ProfileContainer = {
    ...(currentProfile ?? {}),
    ...(responseProfile ?? {}),
    ...(submittedProfile ?? {}),
  };

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
    studentId:
      submittedProfile?.studentId ??
      responseProfile?.profile?.studentId ??
      responseProfile?.studentId ??
      currentProfile?.profile?.studentId,
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
