import {
  ComboboxActionsContext,
  ComboboxStateContext,
  ComboboxStaticContext,
  type ComboboxActionsContextValue,
  type ComboboxStateContextValue,
} from '../primitive-context';
import { ComboboxHiddenInput } from '../primitive-hidden-input';
import {
  type ComboboxRootProps,
  useComboboxRootState,
} from '../primitive-root-state';

export function ComboboxRootComponent<Value>(props: ComboboxRootProps<Value>) {
  const { children, ...rootProps } = props;
  const { context, hiddenInputProps } = useComboboxRootState(rootProps);

  return (
    <ComboboxStaticContext.Provider value={context.staticContext}>
      <ComboboxActionsContext.Provider
        value={context.actions as ComboboxActionsContextValue<unknown>}
      >
        <ComboboxStateContext.Provider
          value={context.state as ComboboxStateContextValue<unknown>}
        >
          {children}
          <ComboboxHiddenInput {...hiddenInputProps} />
        </ComboboxStateContext.Provider>
      </ComboboxActionsContext.Provider>
    </ComboboxStaticContext.Provider>
  );
}
