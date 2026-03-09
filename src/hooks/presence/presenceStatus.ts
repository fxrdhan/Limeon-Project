export const ONLINE_PRESENCE_MAX_AGE_MS = 45_000;
export const PRESENCE_HEARTBEAT_MS = 15_000;
export const PRESENCE_ROSTER_REFRESH_MS = ONLINE_PRESENCE_MAX_AGE_MS;

export const isPresenceFresh = (lastSeen?: string | null): boolean => {
  if (!lastSeen) {
    return false;
  }

  const parsedTime = new Date(lastSeen).getTime();
  if (!Number.isFinite(parsedTime)) {
    return false;
  }

  return Date.now() - parsedTime <= ONLINE_PRESENCE_MAX_AGE_MS;
};

export const getPresenceFreshnessCutoff = () =>
  new Date(Date.now() - ONLINE_PRESENCE_MAX_AGE_MS).toISOString();

export const formatLastSeen = (lastSeen: string): string => {
  const now = new Date();
  const lastSeenDate = new Date(lastSeen);
  const diffInMinutes = Math.floor(
    (now.getTime() - lastSeenDate.getTime()) / (1000 * 60)
  );

  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;

  return lastSeenDate.toLocaleDateString();
};
