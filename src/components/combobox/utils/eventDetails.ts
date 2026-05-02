import type { SyntheticEvent } from 'react';
import type { BaseUIChangeEventDetails } from '@/types';

type EventLike =
  | Event
  | SyntheticEvent<any>
  | { nativeEvent?: Event | null }
  | null
  | undefined;

const getNativeEvent = (event: EventLike): Event | null => {
  if (!event) return null;
  if (typeof Event !== 'undefined' && event instanceof Event) return event;
  if (typeof event === 'object' && 'nativeEvent' in event) {
    return event.nativeEvent ?? null;
  }

  return null;
};

export const createComboboxChangeDetails = <Reason extends string>(
  reason: Reason,
  event?: EventLike
): BaseUIChangeEventDetails<Reason> => {
  let isCanceled = false;
  let isPropagationAllowed = false;

  return {
    reason,
    event: getNativeEvent(event),
    cancel: () => {
      isCanceled = true;
    },
    allowPropagation: () => {
      isPropagationAllowed = true;
    },
    get isCanceled() {
      return isCanceled;
    },
    get isPropagationAllowed() {
      return isPropagationAllowed;
    },
  };
};
