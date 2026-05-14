import { useId, useMemo, useRef, useState } from 'react';
import { useFormFieldContext } from '@/components/form-field/context';
import {
  getComboboxSelectedValue,
  type ComboboxValueIsEmpty,
} from '../utils/preset-value';
import type { ComboboxVirtualScrollToIndex } from './use-combobox-keyboard-highlight-scroll';

type PharmaComboboxCoreStateProps<Item> = {
  id?: string;
  isValueEmpty?: ComboboxValueIsEmpty<Item>;
  label?: string;
  open?: boolean;
  required?: boolean;
  value: Item | null;
};

export function usePharmaComboboxCoreState<Item>({
  id,
  isValueEmpty,
  label,
  open,
  required = false,
  value,
}: PharmaComboboxCoreStateProps<Item>) {
  const formField = useFormFieldContext();
  const instanceId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const popupContentRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const virtualScrollToIndexRef = useRef<ComboboxVirtualScrollToIndex | null>(
    null
  );
  const fallbackLabelId = useId();
  const valueId = useId();
  const [inputValue, setInputValue] = useState('');
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [isSearchNavigationFocus, setIsSearchNavigationFocus] = useState(false);

  const actualOpen = open !== undefined ? open : uncontrolledOpen;
  const isOpenControlled = open !== undefined;
  const effectiveId = id ?? formField?.controlId;
  const effectiveLabel = label ?? formField?.label;
  const effectiveRequired = required || Boolean(formField?.required);
  const selectedValue = useMemo(
    () => getComboboxSelectedValue(value, isValueEmpty),
    [isValueEmpty, value]
  );

  return {
    actualOpen,
    effectiveId,
    effectiveLabel,
    effectiveRequired,
    fallbackLabelId,
    formFieldLabelId: formField?.labelId,
    inputValue,
    instanceId,
    isOpenControlled,
    isSearchNavigationFocus,
    listRef,
    popupContentRef,
    rootRef,
    searchInputRef,
    selectedValue,
    setInputValue,
    setIsSearchNavigationFocus,
    setUncontrolledOpen,
    valueId,
    virtualScrollToIndexRef,
  };
}
