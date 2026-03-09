import { useCallback, useEffect, useRef, useState } from 'react';

interface UseRealtimeChannelRecoveryOptions {
  baseDelayMs?: number;
  maxDelayMs?: number;
}

export const useRealtimeChannelRecovery = ({
  baseDelayMs = 800,
  maxDelayMs = 5_000,
}: UseRealtimeChannelRecoveryOptions = {}) => {
  const [recoveryTick, setRecoveryTick] = useState(0);
  const retryTimeoutRef = useRef<number | null>(null);
  const recoveryAttemptRef = useRef(0);

  const cancelScheduledRecovery = useCallback(() => {
    if (retryTimeoutRef.current === null) {
      return;
    }

    window.clearTimeout(retryTimeoutRef.current);
    retryTimeoutRef.current = null;
  }, []);

  const markRecoverySuccess = useCallback(() => {
    cancelScheduledRecovery();
    recoveryAttemptRef.current = 0;
  }, [cancelScheduledRecovery]);

  const scheduleRecovery = useCallback(() => {
    if (retryTimeoutRef.current !== null) {
      return false;
    }

    const retryDelay = Math.min(
      maxDelayMs,
      baseDelayMs * 2 ** recoveryAttemptRef.current
    );

    retryTimeoutRef.current = window.setTimeout(() => {
      retryTimeoutRef.current = null;
      recoveryAttemptRef.current += 1;
      setRecoveryTick(previousTick => previousTick + 1);
    }, retryDelay);

    return true;
  }, [baseDelayMs, maxDelayMs]);

  useEffect(
    () => () => {
      cancelScheduledRecovery();
    },
    [cancelScheduledRecovery]
  );

  return {
    recoveryTick,
    scheduleRecovery,
    markRecoverySuccess,
    cancelScheduledRecovery,
  };
};
