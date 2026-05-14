import type React from 'react';

export type ComboboxEventReason =
  | 'escape-key'
  | 'focus-out'
  | 'form-reset'
  | 'input-change'
  | 'item-press'
  | 'keyboard'
  | 'none'
  | 'outside-press'
  | 'pointer'
  | 'trigger-press';

export type ComboboxEventDetails = {
  cancel: () => void;
  event?: Event;
  isCanceled: boolean;
  reason: ComboboxEventReason;
};

export type ComboboxHighlightEventDetails = ComboboxEventDetails & {
  index: number;
};

export type ComboboxChangeEventDetails = ComboboxEventDetails;

const getNativeEvent = (event?: React.SyntheticEvent | Event) => {
  if (!event) return undefined;
  return 'nativeEvent' in event ? event.nativeEvent : event;
};

export const createComboboxEventDetails = (
  reason: ComboboxEventReason,
  event?: React.SyntheticEvent | Event
): ComboboxChangeEventDetails => {
  let canceled = false;

  return {
    cancel: () => {
      canceled = true;
    },
    event: getNativeEvent(event),
    get isCanceled() {
      return canceled;
    },
    reason,
  };
};

export const createComboboxHighlightEventDetails = (
  reason: ComboboxEventReason,
  index: number,
  event?: React.SyntheticEvent | Event
): ComboboxHighlightEventDetails =>
  Object.assign(createComboboxEventDetails(reason, event), { index });
