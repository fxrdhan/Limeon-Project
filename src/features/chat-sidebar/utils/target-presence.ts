import {
  chatPresenceService,
  type UserPresence,
} from '@/services/api/chat.service';

export interface TargetPresenceSnapshotResult {
  presence: UserPresence | null;
  errorMessage: string | null;
}

export const loadTargetPresenceSnapshot = async (
  targetUserId: string,
  errorContext: string
): Promise<TargetPresenceSnapshotResult> => {
  try {
    const { data: presence, error } =
      await chatPresenceService.getUserPresence(targetUserId);

    if (error && error.code !== 'PGRST116') {
      console.error(`${errorContext}:`, error);
      return {
        presence: null,
        errorMessage: 'Status online tidak tersedia',
      };
    }

    return {
      presence: presence ?? null,
      errorMessage: null,
    };
  } catch (error) {
    console.error(`${errorContext}:`, error);
    return {
      presence: null,
      errorMessage: 'Status online tidak tersedia',
    };
  }
};
