import { motion } from 'motion/react';
import { TbPlus } from 'react-icons/tb';
import ValidationOverlay from '@/components/validation-overlay';
import { cn } from '@/lib/utils';
import { comboboxHighlightBackgroundTransition } from './components/combobox-highlight-motion';
import ComboboxHoverDetailPopover from './components/combobox-hover-detail-popover';
import { ComboboxOptionList } from './components/combobox-option-list';
import { ComboboxSearchHeader } from './components/combobox-search-header';
import { ComboboxTriggerButton } from './components/combobox-trigger-button';
import { Combobox } from './internal/primitive';
import { comboboxRequiredValidationMessage } from './hooks/use-combobox-validation';
import { usePharmaComboboxSelectController } from './hooks/use-pharma-combobox-select-controller';
import type { PharmaComboboxSelectProps } from './presets-types';

export type {
  PharmaComboboxChangeDetails,
  PharmaComboboxClassNames,
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
  const { classNames } = props;
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
      className={cn(root.className, classNames?.root)}
      onBlur={root.handleComboboxBlur}
    >
      {feedback.shouldRenderFallbackLabel ? (
        <span id={feedback.fallbackLabelId} className="sr-only">
          {feedback.controlName}
        </span>
      ) : null}
      <Combobox.Root<Item> {...root.comboboxRootProps}>
        <ComboboxTriggerButton
          {...trigger.triggerButtonProps}
          classNames={classNames}
        />
        <Combobox.Portal containerRef={popup.containerRef}>
          <Combobox.Positioner
            sideOffset={4}
            matchAnchorWidth={popup.matchAnchorWidth}
            className={cn(
              'z-[1000] w-[var(--anchor-width)]',
              classNames?.positioner
            )}
          >
            <Combobox.Popup
              initialFocus={false}
              className={cn(
                'max-w-[var(--available-width)]',
                popup.className ??
                  'w-full overflow-hidden rounded-xl bg-white shadow-thin-md',
                classNames?.popup
              )}
            >
              <div
                ref={popup.contentRef}
                className={cn(
                  'relative flex max-h-[var(--available-height)] flex-col overflow-hidden',
                  classNames?.popupContent
                )}
                onBlur={root.handleComboboxBlur}
              >
                {highlight.heldFrame ? (
                  <motion.div
                    key={highlight.heldFrameKey}
                    aria-hidden="true"
                    data-pharma-combobox-pinned-highlight=""
                    className={cn(
                      'pointer-events-none absolute z-0 rounded-lg bg-primary/10',
                      classNames?.pinnedHighlight
                    )}
                    style={highlight.heldFrame}
                    initial={false}
                    animate={highlight.heldFrame}
                    transition={comboboxHighlightBackgroundTransition}
                  />
                ) : null}
                {search.searchable ? (
                  <ComboboxSearchHeader
                    {...search.searchHeaderProps}
                    classNames={classNames}
                  />
                ) : null}
                <ComboboxOptionList
                  {...options.optionListProps}
                  classNames={classNames}
                />
                {!options.hasVisibleItems ? (
                  options.emptyAction.canCreate ? (
                    <div
                      className={cn(
                        'empty:hidden relative z-10 px-3 py-4 text-center text-sm text-slate-500',
                        classNames?.empty
                      )}
                    >
                      <button
                        type="button"
                        className={cn(
                          'mx-auto inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-primary transition hover:bg-primary/10 focus:outline-hidden focus:ring-2 focus:ring-primary/20',
                          classNames?.createAction
                        )}
                        onMouseDown={event => event.preventDefault()}
                        onClick={options.emptyAction.onCreate}
                      >
                        <TbPlus
                          aria-hidden="true"
                          className={cn(
                            'h-4 w-4',
                            classNames?.createActionIcon
                          )}
                        />
                        <span className={classNames?.createActionLabel}>
                          {options.emptyAction.label}
                        </span>
                      </button>
                    </div>
                  ) : (
                    <Combobox.Empty
                      className={cn(
                        'empty:hidden relative z-10 px-3 py-4 text-center text-sm text-slate-500',
                        classNames?.empty
                      )}
                    >
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
          classNames={{
            arrow: classNames?.validationArrow,
            container: classNames?.validationContainer,
            icon: classNames?.validationIcon,
            message: classNames?.validationMessage,
            overlay: classNames?.validationOverlay,
          }}
        />
      ) : null}
      {hoverDetail.enabled ? (
        <ComboboxHoverDetailPopover
          data={hoverDetail.data}
          isVisible={hoverDetail.isVisible}
          position={hoverDetail.position}
          classNames={classNames}
        />
      ) : null}
    </div>
  );
}
