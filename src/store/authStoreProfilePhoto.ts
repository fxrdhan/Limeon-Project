import { PROFILE_PHOTO_BUCKET } from '../../shared/profilePhotoPaths';
import type { UserDetails } from '@/types/database';

type AuthServiceClient = typeof import('@/services/api/auth.service').default;
type AuthProfilePhotoServiceClient = Pick<
  AuthServiceClient,
  'clearUserProfilePhoto' | 'updateUserProfilePhotoAssets'
>;
type StorageServiceClient =
  typeof import('@/services/api/storage.service').StorageService;

const deleteExistingProfilePhotoAssets = async (
  user: UserDetails,
  StorageService: StorageServiceClient
) => {
  if (user.profilephoto) {
    const oldPath =
      user.profilephoto_path ||
      StorageService.extractPathFromUrl(
        user.profilephoto,
        PROFILE_PHOTO_BUCKET
      );
    if (oldPath) {
      await StorageService.deleteEntityImage(PROFILE_PHOTO_BUCKET, oldPath);
    }
  }

  if (user.profilephoto_thumb) {
    const oldThumbnailPath = StorageService.extractPathFromUrl(
      user.profilephoto_thumb,
      PROFILE_PHOTO_BUCKET
    );
    if (oldThumbnailPath) {
      await StorageService.deleteEntityImage(
        PROFILE_PHOTO_BUCKET,
        oldThumbnailPath
      );
    }
  }
};

export const updateAuthProfilePhotoAssets = async ({
  authService,
  file,
  user,
}: {
  authService: AuthProfilePhotoServiceClient;
  file: File;
  user: UserDetails;
}) => {
  const [{ StorageService }, { buildProfilePhotoUploadPlan }] =
    await Promise.all([
      import('@/services/api/storage.service'),
      import('@/utils/profilePhoto'),
    ]);

  await deleteExistingProfilePhotoAssets(user, StorageService);

  const uploadPlan = await buildProfilePhotoUploadPlan(user.id, file);
  const { publicUrl } = await StorageService.uploadFile(
    PROFILE_PHOTO_BUCKET,
    file,
    uploadPlan.originalPath
  );
  let thumbnailUrl: string | null = null;
  if (uploadPlan.thumbnailFile && uploadPlan.thumbnailPath) {
    const thumbnailUpload = await StorageService.uploadRawFile(
      PROFILE_PHOTO_BUCKET,
      uploadPlan.thumbnailFile,
      uploadPlan.thumbnailPath,
      uploadPlan.thumbnailFile.type
    );
    thumbnailUrl = thumbnailUpload.publicUrl;
  }

  const updatedUser = await authService.updateUserProfilePhotoAssets(user.id, {
    profilephoto: publicUrl,
    profilephoto_thumb: thumbnailUrl,
    profilephoto_path: uploadPlan.originalPath,
  });

  return (
    updatedUser ??
    ({
      ...user,
      profilephoto: publicUrl,
      profilephoto_thumb: thumbnailUrl,
      profilephoto_path: uploadPlan.originalPath,
    } satisfies UserDetails)
  );
};

export const deleteAuthProfilePhotoAssets = async ({
  authService,
  user,
}: {
  authService: AuthProfilePhotoServiceClient;
  user: UserDetails;
}) => {
  const { StorageService } = await import('@/services/api/storage.service');

  await deleteExistingProfilePhotoAssets(user, StorageService);
  await authService.clearUserProfilePhoto(user.id);
};
