import { useComboboxOptionHover } from './use-combobox-option-hover';
import type { useComboboxOptionInteractionInfrastructure } from './use-combobox-option-interaction-infrastructure';
import type {
  ComboboxOptionInteractionCore,
  ComboboxOptionInteractionHoverDetail,
  ComboboxOptionInteractionSelection,
} from './use-combobox-option-interaction-types';

export function useComboboxOptionInteractionHoverState<Item>({
  core,
  hoverDetail,
  infrastructure,
  selection,
}: {
  core: Pick<ComboboxOptionInteractionCore, 'actualOpen' | 'popupContentRef'>;
  hoverDetail: ComboboxOptionInteractionHoverDetail<Item>;
  infrastructure: ReturnType<typeof useComboboxOptionInteractionInfrastructure>;
  selection: Pick<
    ComboboxOptionInteractionSelection<Item>,
    'isItemDisabled' | 'selectedValue'
  >;
}) {
  const {
    hoverDetail: hoverDetailConfig,
    itemToHoverDetailData,
    itemToStringLabel,
    itemToStringValue,
    onFetchHoverDetail,
    onFetchHoverDetailError,
  } = hoverDetail;

  return useComboboxOptionHover({
    actualOpen: core.actualOpen,
    clearKeyboardHoverDetailSync: infrastructure.clearKeyboardHoverDetailSync,
    clearKeyboardScrollHighlight:
      infrastructure.keyboardScroll.clearKeyboardScrollHighlight,
    hoverDetail: hoverDetailConfig,
    isItemDisabled: selection.isItemDisabled,
    itemToHoverDetailData,
    itemToStringLabel,
    itemToStringValue,
    onFetchHoverDetail,
    onFetchHoverDetailError,
    popupContentRef: core.popupContentRef,
    selectedValue: selection.selectedValue,
  });
}
