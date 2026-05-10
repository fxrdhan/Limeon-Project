import { motion } from 'motion/react';
import ValidationOverlay from '@/components/validation-overlay';
import { cn } from '@/lib/utils';
import { comboboxHighlightBackgroundTransition } from './components/combobox-highlight-motion';
import ComboboxHoverDetailPopover from './components/combobox-hover-detail-popover';
import { ComboboxOptionList } from './components/combobox-option-list';
import { ComboboxSearchHeader } from './components/combobox-search-header';
import { ComboboxTriggerButton } from './components/combobox-trigger-button';
import { Combobox } from './primitive';
import { comboboxRequiredValidationMessage } from './hooks/use-combobox-validation';
import { usePharmaComboboxSelectController } from './hooks/use-pharma-combobox-select-controller';
import type { PharmaComboboxSelectProps } from './presets-types';

export type {
  PharmaComboboxChangeDetails,
  PharmaComboboxOpenChangeDetails,
  PharmaComboboxOptionRenderState,
  PharmaComboboxSelectProps,
} from './presets-types';

export function PharmaComboboxSelect<Item>(
  props: PharmaComboboxSelectProps<Item>
) {
  const {
    actualOpen,
    className,
    comboboxRootProps,
    controlName,
    emptyText,
    fallbackLabelId,
    handleComboboxBlur,
    heldHighlightFrame,
    heldHighlightFrameKey,
    hoverDetail,
    optionListProps,
    popupClassName,
    popupContentRef,
    rootRef,
    searchable,
    searchHeaderProps,
    shouldRenderFallbackLabel,
    triggerButtonProps,
    validationState,
  } = usePharmaComboboxSelectController(props);

  return (
    <div ref={rootRef} className={className} onBlur={handleComboboxBlur}>
      {shouldRenderFallbackLabel ? (
        <span id={fallbackLabelId} className="sr-only">
          {controlName}
        </span>
      ) : null}
      <Combobox.Root<Item> {...comboboxRootProps}>
        <ComboboxTriggerButton {...triggerButtonProps} />
        <Combobox.Portal>
          <Combobox.Positioner
            sideOffset={4}
            matchAnchorWidth={popupClassName === undefined}
            className="z-[1000] w-[var(--anchor-width)]"
          >
            <Combobox.Popup
              initialFocus={false}
              className={cn(
                'max-w-[var(--available-width)]',
                popupClassName ??
                  'w-full overflow-hidden rounded-xl bg-white shadow-thin-md'
              )}
            >
              <div
                ref={popupContentRef}
                className="relative flex max-h-[var(--available-height)] flex-col overflow-hidden"
                onBlur={handleComboboxBlur}
              >
                {heldHighlightFrame ? (
                  <motion.div
                    key={heldHighlightFrameKey}
                    aria-hidden="true"
                    data-pharma-combobox-pinned-highlight=""
                    className="pointer-events-none absolute z-0 rounded-lg bg-primary/10"
                    style={heldHighlightFrame}
                    initial={false}
                    animate={heldHighlightFrame}
                    transition={comboboxHighlightBackgroundTransition}
                  />
                ) : null}
                {searchable ? (
                  <ComboboxSearchHeader {...searchHeaderProps} />
                ) : null}
                <ComboboxOptionList {...optionListProps} />
                <Combobox.Empty className="empty:hidden relative z-10 px-3 py-4 text-center text-sm text-slate-500">
                  {emptyText}
                </Combobox.Empty>
              </div>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
      {validationState.enabled ? (
        <span id={validationState.messageId} className="sr-only">
          {validationState.show ? comboboxRequiredValidationMessage : ''}
        </span>
      ) : null}
      {validationState.enabled ? (
        <ValidationOverlay
          error={comboboxRequiredValidationMessage}
          showError={Boolean(validationState.show)}
          targetRef={rootRef}
          autoHide={validationState.autoHide}
          autoHideDelay={validationState.autoHideDelay}
          isOpen={actualOpen}
        />
      ) : null}
      {hoverDetail.enabled ? (
        <ComboboxHoverDetailPopover
          data={hoverDetail.data}
          isVisible={hoverDetail.isVisible}
          position={hoverDetail.position}
        />
      ) : null}
    </div>
  );
}
