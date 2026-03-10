// Mirrors public.compute_dm_channel_id in Supabase.
export const computeDmChannelId = (
  userId1: string,
  userId2: string
): string => {
  const sortedIds = [userId1, userId2].sort();
  return `dm_${sortedIds[0]}_${sortedIds[1]}`;
};

export const generateChannelId = computeDmChannelId;
