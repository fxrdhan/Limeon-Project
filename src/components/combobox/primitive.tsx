import {
  ComboboxContext,
  type ComboboxContextValue,
} from './primitive-context';
import { ComboboxHiddenInput } from './primitive-hidden-input';
import { ComboboxInput } from './primitive-input';
import { ComboboxLabel } from './primitive-label';
import { ComboboxTrigger } from './primitive-trigger';
import { ComboboxValue } from './primitive-value';
import {
  ComboboxCollection,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxItemIndicator,
  ComboboxList,
  ComboboxStatus,
} from './primitive-items';
import {
  ComboboxPopup,
  ComboboxPortal,
  ComboboxPositioner,
} from './primitive-popup';
import {
  type ComboboxRootProps,
  useComboboxRootState,
} from './primitive-root-state';
import {
  type ComboboxChangeEventDetails,
  type ComboboxEventReason as EventReason,
  type ComboboxHighlightEventDetails,
} from './utils/primitive-events';
export type { ComboboxRootProps } from './primitive-root-state';
export type {
  ComboboxChangeEventDetails,
  ComboboxEventDetails,
  ComboboxHighlightEventDetails,
} from './utils/primitive-events';

export namespace ComboboxRoot {
  export type ChangeEventDetails = ComboboxChangeEventDetails;
  export type HighlightEventDetails = ComboboxHighlightEventDetails;
  export type ChangeEventReason = EventReason;
  export type HighlightEventReason = EventReason;
  export type Props<Value> = ComboboxRootProps<Value>;
}

function ComboboxRootComponent<Value>(props: ComboboxRootProps<Value>) {
  const { children, ...rootProps } = props;
  const { context, hiddenInputProps } = useComboboxRootState(rootProps);

  return (
    <ComboboxContext.Provider value={context as ComboboxContextValue<unknown>}>
      {children}
      <ComboboxHiddenInput {...hiddenInputProps} />
    </ComboboxContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- public compound component namespace
export const Combobox = {
  Collection: ComboboxCollection,
  Empty: ComboboxEmpty,
  Input: ComboboxInput,
  Item: ComboboxItem,
  ItemIndicator: ComboboxItemIndicator,
  Label: ComboboxLabel,
  List: ComboboxList,
  Popup: ComboboxPopup,
  Portal: ComboboxPortal,
  Positioner: ComboboxPositioner,
  Root: ComboboxRootComponent,
  Status: ComboboxStatus,
  Trigger: ComboboxTrigger,
  Value: ComboboxValue,
};

export default Combobox;
