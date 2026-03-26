export const useTargetProfilePhoto = (targetUser?: {
  id: string;
  profilephoto?: string | null;
  profilephoto_thumb?: string | null;
}) => {
  return {
    displayTargetPhotoUrl:
      targetUser?.profilephoto_thumb ?? targetUser?.profilephoto ?? null,
  };
};
