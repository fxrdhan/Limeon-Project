import { motion } from 'motion/react';
import { TbPlus } from 'react-icons/tb';
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
  PharmaComboboxDisplayConfig,
  PharmaComboboxFieldConfig,
  PharmaComboboxHoverDetailConfig,
  PharmaComboboxInteractionConfig,
  PharmaComboboxItemConfig,
  PharmaComboboxOpenChangeDetails,
  PharmaComboboxOptionRenderState,
  PharmaComboboxPopupConfig,
  PharmaComboboxSearchConfig,
  PharmaComboboxSelectProps,
  PharmaComboboxValidationConfig,
} from './presets-types';

export function PharmaComboboxSelect<Item>(
  props: PharmaComboboxSelectProps<Item>
) {
  const {
    feedback,
    highlight,
    hoverDetail,
    options,
    popup,
    root,
    search,
    trigger,
  } = usePharmaComboboxSelectController(props);

  return (
    <div
      ref={root.rootRef}
      className={root.className}
      onBlur={root.handleComboboxBlur}
    >
      {feedback.shouldRenderFallbackLabel ? (
        <span id={feedback.fallbackLabelId} className="sr-only">
          {feedback.controlName}
        </span>
      ) : null}
      <Combobox.Root<Item> {...root.comboboxRootProps}>
        <ComboboxTriggerButton {...trigger.triggerButtonProps} />
        <Combobox.Portal containerRef={popup.containerRef}>
          <Combobox.Positioner
            sideOffset={4}
            matchAnchorWidth={popup.matchAnchorWidth}
            className="z-[1000] w-[var(--anchor-width)]"
          >
            <Combobox.Popup
              initialFocus={false}
              className={cn(
                'max-w-[var(--available-width)]',
                popup.className ??
                  'w-full overflow-hidden rounded-xl bg-white shadow-thin-md'
              )}
            >
              <div
                ref={popup.contentRef}
                className="relative flex max-h-[var(--available-height)] flex-col overflow-hidden"
                onBlur={root.handleComboboxBlur}
              >
                {highlight.heldFrame ? (
                  <motion.div
                    key={highlight.heldFrameKey}
                    aria-hidden="true"
                    data-pharma-combobox-pinned-highlight=""
                    className="pointer-events-none absolute z-0 rounded-lg bg-primary/10"
                    style={highlight.heldFrame}
                    initial={false}
                    animate={highlight.heldFrame}
                    transition={comboboxHighlightBackgroundTransition}
                  />
                ) : null}
                {search.searchable ? (
                  <ComboboxSearchHeader {...search.searchHeaderProps} />
                ) : null}
                <ComboboxOptionList {...options.optionListProps} />
                {!options.hasVisibleItems ? (
                  options.emptyAction.canCreate ? (
                    <div className="empty:hidden relative z-10 px-3 py-4 text-center text-sm text-slate-500">
                      <button
                        type="button"
                        className="mx-auto inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-primary transition hover:bg-primary/10 focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                        onMouseDown={event => event.preventDefault()}
                        onClick={options.emptyAction.onCreate}
                      >
                        <TbPlus aria-hidden="true" className="h-4 w-4" />
                        <span>{options.emptyAction.label}</span>
                      </button>
                    </div>
                  ) : (
                    <Combobox.Empty className="empty:hidden relative z-10 px-3 py-4 text-center text-sm text-slate-500">
                      {options.emptyText}
                    </Combobox.Empty>
                  )
                ) : null}
              </div>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
      {feedback.validationState.enabled ? (
        <span id={feedback.validationState.messageId} className="sr-only">
          {feedback.validationState.show
            ? comboboxRequiredValidationMessage
            : ''}
        </span>
      ) : null}
      {feedback.validationState.enabled ? (
        <ValidationOverlay
          error={comboboxRequiredValidationMessage}
          showError={Boolean(feedback.validationState.show)}
          targetRef={root.rootRef}
          autoHide={feedback.validationState.autoHide}
          autoHideDelay={feedback.validationState.autoHideDelay}
          isOpen={root.actualOpen}
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
