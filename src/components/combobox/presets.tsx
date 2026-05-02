import React, { useMemo, useRef, useState } from 'react';
import {
  TbCheck,
  TbCircle,
  TbCircleCheck,
  TbPlus,
  TbSquare,
  TbSquareCheck,
} from 'react-icons/tb';
import ValidationOverlay from '@/components/validation-overlay';
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
  open,
  onOpenChange,
}: PharmaComboboxSelectProps<Item>) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [blurred, setBlurred] = useState(false);
  const showValidation =
    validation?.enabled && required && blurred && value == null;
  const canCreate =
    createAction &&
    inputValue.trim().length > 0 &&
    !items.some(
      item =>
        itemToStringLabel(item).toLocaleLowerCase('id-ID') ===
        inputValue.trim().toLocaleLowerCase('id-ID')
    );

  const selectedValue = useMemo(() => value, [value]);

  return (
    <div ref={rootRef} className={className}>
      <Combobox.Root
        items={items}
        value={selectedValue}
        onValueChange={nextValue => {
          onValueChange(nextValue);
          setInputValue('');
        }}
        open={open}
        onOpenChange={nextOpen => onOpenChange?.(nextOpen)}
        inputValue={inputValue}
        onInputValueChange={setInputValue}
        itemToStringLabel={itemToStringLabel}
        itemToStringValue={itemToStringValue}
        isItemEqualToValue={isItemEqualToValue}
        name={name}
        form={form}
        disabled={disabled}
        readOnly={readOnly}
        required={required}
        filter={(item, search, locale) =>
          itemToStringLabel(item)
            .toLocaleLowerCase(locale)
            .includes(search.toLocaleLowerCase(locale))
        }
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
              {props.children}
            </button>
          )}
        />
        <Combobox.Portal>
          <Combobox.Positioner>
            <Combobox.Popup
              className={
                popupClassName ??
                'overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl'
              }
            >
              {searchable ? (
                <Combobox.SearchInput placeholder="Cari..." />
              ) : null}
              <Combobox.List>
                <Combobox.Collection>
                  {(item: Item, index) => (
                    <Combobox.Item
                      key={itemToStringValue(item)}
                      item={item}
                      index={index}
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
                <Combobox.Empty />
                {canCreate ? (
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2 text-left text-sm font-medium text-primary hover:bg-emerald-50"
                    onClick={() => createAction.onCreate(inputValue.trim())}
                  >
                    <TbPlus className="h-4 w-4" />
                    {createAction.label ?? 'Tambah baru'}
                  </button>
                ) : null}
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
          isOpen={open}
        />
      ) : null}
    </div>
  );
}
