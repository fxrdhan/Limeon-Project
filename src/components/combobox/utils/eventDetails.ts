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

const getEventElement = (target: EventTarget | null | undefined) =>
  target instanceof Element ? target : undefined;

const getTriggerElement = (
  event: EventLike,
  nativeEvent: Event | null
): Element | undefined => {
  if (event && typeof event === 'object' && 'currentTarget' in event) {
    const currentTarget = getEventElement(event.currentTarget);
    if (currentTarget) return currentTarget;
  }

  const nativeCurrentTarget = getEventElement(nativeEvent?.currentTarget);
  if (nativeCurrentTarget) return nativeCurrentTarget;

  const target = nativeEvent?.target;
  return target instanceof Element ? target : undefined;
};

export const createComboboxChangeDetails = <Reason extends string>(
  reason: Reason,
  event?: EventLike
): BaseUIChangeEventDetails<Reason> => {
  let isCanceled = false;
  let isPropagationAllowed = false;
  const nativeEvent = getNativeEvent(event);

  return {
    reason,
    event: nativeEvent,
    trigger: getTriggerElement(event, nativeEvent),
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
