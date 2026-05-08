import React, { useCallback, useId, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  TbCheck,
  TbChevronDown,
  TbCircle,
  TbCircleCheck,
  TbPlus,
  TbSearch,
  TbSquare,
  TbSquareCheck,
} from 'react-icons/tb';
import ValidationOverlay from '@/components/validation-overlay';
import { cn } from '@/lib/utils';
import type { HoverDetailData } from '@/types/components';
import ComboboxHoverDetailPopover from './components/combobox-hover-detail-popover';
import { useComboboxHoverDetail } from './hooks/use-combobox-hover-detail';
import { Combobox } from './index';

type IndicatorKind = 'check' | 'radio' | 'checkbox' | 'none';

export interface PharmaComboboxSelectProps<Item> {
  name: string;
  items: Item[];
  value: Item | null;
  onValueChange: (item: Item | null) => void;
  itemToStringLabel: (item: Item) => string;
  itemToStringValue: (item: Item) => string;
  isItemEqualToValue?: (item: Item, value: Item) => boolean;
  placeholder?: string;
  searchable?: boolean;
  indicator?: IndicatorKind;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  tabIndex?: number;
  form?: string;
  className?: string;
  popupClassName?: string;
  validation?: {
    enabled?: boolean;
    autoHide?: boolean;
    autoHideDelay?: number;
  };
  createAction?: {
    label?: string;
    onCreate: (searchTerm?: string) => void;
  };
  hoverDetail?: {
    enabled?: boolean;
    delay?: number;
  };
  onFetchHoverDetail?: (id: string) => Promise<HoverDetailData | null>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const setRef = <Node,>(
  ref: React.Ref<Node> | undefined,
  value: Node | null
) => {
  if (!ref) return;
  if (typeof ref === 'function') {
    ref(value);
    return;
  }
  ref.current = value;
};

const getIndicator = (kind: IndicatorKind, selected: boolean) => {
  if (kind === 'none') return null;
  if (kind === 'radio') {
    return selected ? (
      <TbCircleCheck className="h-4 w-4 shrink-0 text-primary" />
    ) : (
      <TbCircle className="h-4 w-4 shrink-0 text-slate-300" />
    );
  }
  if (kind === 'checkbox') {
    return selected ? (
      <TbSquareCheck className="h-4 w-4 shrink-0 text-primary" />
    ) : (
      <TbSquare className="h-4 w-4 shrink-0 text-slate-300" />
    );
  }
  return (
    <span className="flex h-4 w-4 shrink-0 items-center justify-center">
      {selected ? <TbCheck className="h-4 w-4 text-primary" /> : null}
    </span>
  );
};

const highlightBackgroundTransition = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 30,
  mass: 0.8,
};

const isDisabledItem = <Item,>(item: Item) =>
  typeof item === 'object' &&
  item !== null &&
  'disabled' in item &&
  Boolean(item.disabled);

export function PharmaComboboxSelect<Item>({
  name,
  items,
  value,
  onValueChange,
  itemToStringLabel,
  itemToStringValue,
  isItemEqualToValue,
  placeholder = '-- Pilih --',
  searchable = true,
  indicator = 'none',
  required = false,
  disabled = false,
  readOnly = false,
  tabIndex,
  form,
  className,
  popupClassName,
  validation,
  createAction,
  hoverDetail,
  onFetchHoverDetail,
  open,
  onOpenChange,
}: PharmaComboboxSelectProps<Item>) {
  const instanceId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [blurred, setBlurred] = useState(false);
  const actualOpen = open ?? uncontrolledOpen;
  const showValidation =
    validation?.enabled && required && blurred && value == null;
  const normalizedInputValue = inputValue.trim();
  const matchesSearch = useCallback(
    (item: Item, search: string, locale: string) =>
      itemToStringLabel(item)
        .toLocaleLowerCase(locale)
        .includes(search.toLocaleLowerCase(locale)),
    [itemToStringLabel]
  );
  const visibleItems = useMemo(
    () =>
      normalizedInputValue
        ? items.filter(item =>
            matchesSearch(item, normalizedInputValue, 'id-ID')
          )
        : items,
    [items, matchesSearch, normalizedInputValue]
  );
  const hasExactItem = useMemo(
    () =>
      items.some(
        item =>
          itemToStringLabel(item).toLocaleLowerCase('id-ID') ===
          normalizedInputValue.toLocaleLowerCase('id-ID')
      ),
    [itemToStringLabel, items, normalizedInputValue]
  );
  const canCreate = Boolean(
    createAction &&
    normalizedInputValue.length > 0 &&
    visibleItems.length === 0 &&
    !hasExactItem
  );

  const selectedValue = useMemo(() => value, [value]);
  const hoverDetailEnabled =
    hoverDetail?.enabled ?? Boolean(onFetchHoverDetail);
  const {
    data: hoverDetailData,
    handleItemHover,
    handleItemLeave,
    hidePopover: hideHoverDetail,
    isVisible: isHoverDetailVisible,
    position: hoverDetailPosition,
  } = useComboboxHoverDetail({
    hoverDelay: hoverDetail?.delay ?? 800,
    isComboboxOpen: actualOpen,
    isEnabled: hoverDetailEnabled,
    onFetchData: onFetchHoverDetail,
  });
  const getItemHoverDetailData = useCallback(
    (item: Item): Partial<HoverDetailData> => {
      const itemRecord =
        typeof item === 'object' && item !== null
          ? (item as Partial<HoverDetailData>)
          : {};

      return {
        id: itemToStringValue(item),
        name: itemToStringLabel(item),
        display: itemRecord.display,
        data: itemRecord.data,
        code: itemRecord.code,
        description: itemRecord.description,
        metaLabel: itemRecord.metaLabel,
        metaTone: itemRecord.metaTone,
        created_at: itemRecord.created_at,
        createdAt: itemRecord.createdAt,
        updated_at: itemRecord.updated_at,
        updatedAt: itemRecord.updatedAt,
      };
    },
    [itemToStringLabel, itemToStringValue]
  );
  const activeBackgroundLayoutId = `combobox-active-background-${instanceId}-${inputValue}`;

  return (
    <div ref={rootRef} className={className}>
      <Combobox.Root
        items={items}
        value={selectedValue}
        onValueChange={nextValue => {
          onValueChange(nextValue);
          setInputValue('');
          hideHoverDetail();
        }}
        open={actualOpen}
        onOpenChange={nextOpen => {
          setUncontrolledOpen(nextOpen);
          if (!nextOpen) hideHoverDetail();
          onOpenChange?.(nextOpen);
        }}
        inputValue={inputValue}
        onInputValueChange={nextValue => {
          setInputValue(nextValue);
          hideHoverDetail();
        }}
        itemToStringLabel={itemToStringLabel}
        itemToStringValue={itemToStringValue}
        isItemEqualToValue={isItemEqualToValue}
        name={name}
        form={form}
        disabled={disabled}
        readOnly={readOnly}
        required={required}
        filter={matchesSearch}
      >
        <Combobox.Trigger
          placeholder={placeholder}
          tabIndex={tabIndex}
          render={(props, state) => (
            <button
              {...props}
              ref={node => {
                setRef(props.ref, node);
              }}
              onBlur={event => {
                props.onBlur?.(event);
                setBlurred(true);
              }}
              className={`flex min-h-10 w-full items-center justify-between gap-2 rounded-xl border bg-white px-3 py-2 text-left text-sm shadow-sm transition focus:border-primary focus:outline-hidden focus:ring-3 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100 ${
                showValidation
                  ? 'border-red-400'
                  : state.open
                    ? 'border-primary'
                    : 'border-slate-300'
              }`}
            >
              <span
                className={
                  state.selectedLabel ? 'truncate' : 'truncate text-slate-400'
                }
              >
                {state.selectedLabel || placeholder}
              </span>
              <TbChevronDown
                aria-hidden="true"
                className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${
                  state.open ? 'rotate-180' : ''
                }`}
              />
            </button>
          )}
        />
        <Combobox.Portal>
          <Combobox.Positioner>
            <Combobox.Popup
              className={
                popupClassName ??
                'overflow-hidden rounded-xl bg-white shadow-thin-md'
              }
            >
              {searchable ? (
                <div className="sticky top-0 z-10 border-b border-slate-200 bg-white p-2">
                  <div className="relative flex items-center">
                    <TbSearch
                      aria-hidden="true"
                      className={cn(
                        'pointer-events-none absolute left-3 h-4 w-4',
                        normalizedInputValue ? 'text-primary' : 'text-slate-400'
                      )}
                    />
                    <Combobox.SearchInput
                      className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-10 text-sm text-slate-800 outline-hidden transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/15"
                      placeholder="Cari..."
                    />
                    {canCreate ? (
                      <button
                        type="button"
                        aria-label={createAction?.label ?? 'Tambah baru'}
                        className="absolute right-2 inline-flex h-6 w-6 items-center justify-center rounded-md text-primary transition hover:bg-primary/10"
                        onMouseDown={event => event.preventDefault()}
                        onClick={() =>
                          createAction?.onCreate(normalizedInputValue)
                        }
                      >
                        <TbPlus aria-hidden="true" className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}
              <Combobox.List className="max-h-60 overflow-y-auto p-1 outline-hidden">
                <Combobox.Collection>
                  {(item: Item, index) => (
                    <Combobox.Item
                      key={itemToStringValue(item)}
                      item={item}
                      index={index}
                      onMouseEnter={event => {
                        if (!hoverDetailEnabled || isDisabledItem(item)) return;

                        handleItemHover(
                          itemToStringValue(item),
                          event.currentTarget,
                          getItemHoverDetailData(item)
                        );
                      }}
                      onMouseLeave={handleItemLeave}
                      render={(props, state) => (
                        <div
                          {...props}
                          className={cn(
                            'relative flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-800 outline-hidden',
                            state.selected && 'font-semibold text-primary',
                            state.disabled && 'cursor-not-allowed opacity-50'
                          )}
                        >
                          {state.highlighted ? (
                            <motion.div
                              key={activeBackgroundLayoutId}
                              layoutId={activeBackgroundLayoutId}
                              initial={false}
                              className="pointer-events-none absolute inset-0 z-0 rounded-lg bg-primary/10"
                              transition={highlightBackgroundTransition}
                            />
                          ) : null}
                          <span className="relative z-10 flex min-w-0 flex-1 items-center gap-2">
                            {props.children}
                          </span>
                        </div>
                      )}
                    >
                      {state => (
                        <>
                          {getIndicator(indicator, state.selected)}
                          <span className="min-w-0 flex-1 truncate">
                            {itemToStringLabel(item)}
                          </span>
                        </>
                      )}
                    </Combobox.Item>
                  )}
                </Combobox.Collection>
                <Combobox.Empty className="px-3 py-4 text-center text-sm text-slate-500">
                  Tidak ada data
                </Combobox.Empty>
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
      {validation?.enabled ? (
        <ValidationOverlay
          error="Field ini wajib diisi"
          showError={Boolean(showValidation)}
          targetRef={rootRef}
          autoHide={validation.autoHide}
          autoHideDelay={validation.autoHideDelay}
          isOpen={actualOpen}
        />
      ) : null}
      {hoverDetailEnabled ? (
        <ComboboxHoverDetailPopover
          data={hoverDetailData}
          isVisible={isHoverDetailVisible}
          position={hoverDetailPosition}
        />
      ) : null}
    </div>
  );
}
