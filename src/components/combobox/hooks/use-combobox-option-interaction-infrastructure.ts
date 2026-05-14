import { useComboboxKeyboardHoverDetailTimer } from './use-combobox-keyboard-hover-detail-timer';
import { useComboboxOptionElements } from './use-combobox-option-elements';
import { useComboboxOptionKeyboardScroll } from './use-combobox-option-keyboard-scroll';
import type { ComboboxOptionInteractionCore } from './use-combobox-option-interaction-types';

export function useComboboxOptionInteractionInfrastructure({
  core,
  visibleItemCount,
}: {
  core: Pick<
    ComboboxOptionInteractionCore,
    'actualOpen' | 'listRef' | 'popupContentRef' | 'virtualScrollToIndexRef'
  >;
  visibleItemCount: number;
}) {
  const { actualOpen, listRef, popupContentRef, virtualScrollToIndexRef } =
    core;
  const optionElements = useComboboxOptionElements({ listRef });
  const keyboardHoverDetailTimer = useComboboxKeyboardHoverDetailTimer();
  const keyboardScroll = useComboboxOptionKeyboardScroll({
    actualOpen,
    getOptionElementAtIndex: optionElements.getOptionElementAtIndex,
    listRef,
    popupContentRef,
    virtualScrollToIndexRef,
    visibleItemCount,
  });

  return {
    ...optionElements,
    ...keyboardHoverDetailTimer,
    keyboardScroll,
  };
}
