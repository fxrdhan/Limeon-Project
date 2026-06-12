import { ComboboxInput } from '../primitive-input';
import { ComboboxLabel } from '../primitive-label';
import { ComboboxTrigger } from '../primitive-trigger';
import { ComboboxValue } from '../primitive-value';
import {
  ComboboxCollection,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxItemIndicator,
  ComboboxList,
  ComboboxStatus,
} from '../primitive-items';
import {
  ComboboxPopup,
  ComboboxPortal,
  ComboboxPositioner,
} from '../primitive-popup';
import { type ComboboxRootProps } from '../primitive-root-state';
import {
  type ComboboxChangeEventDetails,
  type ComboboxEventReason as EventReason,
  type ComboboxHighlightEventDetails,
} from '../utils/primitive-events';
import { ComboboxRootComponent } from './ComboboxRoot';

export type { ComboboxRootProps } from '../primitive-root-state';
export type {
  ComboboxChangeEventDetails,
  ComboboxEventDetails,
  ComboboxHighlightEventDetails,
} from '../utils/primitive-events';

export namespace ComboboxRoot {
  export type ChangeEventDetails = ComboboxChangeEventDetails;
  export type HighlightEventDetails = ComboboxHighlightEventDetails;
  export type ChangeEventReason = EventReason;
  export type HighlightEventReason = EventReason;
  export type Props<Value> = ComboboxRootProps<Value>;
}

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
