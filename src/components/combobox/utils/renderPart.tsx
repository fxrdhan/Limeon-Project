import { cloneElement, isValidElement } from 'react';
import type { CSSProperties, MutableRefObject, ReactElement } from 'react';
import type { ComboboxRenderProp } from '../types';

type RenderPartProps = {
  className?: string;
  style?: CSSProperties;
  ref?: unknown;
};

const setRef = <T,>(ref: unknown, value: T | null) => {
  if (!ref) return;

  if (typeof ref === 'function') {
    ref(value);
    return;
  }

  if (typeof ref === 'object' && 'current' in ref) {
    (ref as MutableRefObject<T | null>).current = value;
  }
};

const composeRefs =
  <T,>(...refs: unknown[]) =>
  (value: T | null) => {
    refs.forEach(ref => setRef(ref, value));
  };

const isEventHandler = (key: string, value: unknown) =>
  /^on[A-Z]/.test(key) && typeof value === 'function';

const isDefaultPrevented = (event: unknown) => {
  if (!event || typeof event !== 'object') return false;

  if ('defaultPrevented' in event && event.defaultPrevented === true) {
    return true;
  }

  if (
    'isDefaultPrevented' in event &&
    typeof event.isDefaultPrevented === 'function'
  ) {
    return event.isDefaultPrevented() === true;
  }

  return false;
};

const mergeElementProps = <Props extends RenderPartProps>(
  element: ReactElement,
  props: Props
) => {
  const elementProps = element.props as RenderPartProps;
  const propRecord = props as RenderPartProps & Record<string, unknown>;
  const elementRecord = elementProps as RenderPartProps &
    Record<string, unknown>;
  const mergedProps: RenderPartProps & Record<string, unknown> = {
    ...elementProps,
    ...props,
  };

  if (elementProps.className || props.className) {
    mergedProps.className = [props.className, elementProps.className]
      .filter(Boolean)
      .join(' ');
  }

  if (elementProps.style || props.style) {
    mergedProps.style = {
      ...props.style,
      ...elementProps.style,
    };
  }

  Object.entries(elementRecord).forEach(([key, elementValue]) => {
    const propValue = propRecord[key];
    if (!isEventHandler(key, elementValue) || typeof propValue !== 'function') {
      return;
    }

    const elementHandler = elementValue as (...args: unknown[]) => void;
    const propHandler = propValue as (...args: unknown[]) => void;

    mergedProps[key] = (...args: unknown[]) => {
      elementHandler(...args);
      if (isDefaultPrevented(args[0])) {
        return;
      }
      propHandler(...args);
    };
  });

  const elementRef = (element as ReactElement & { ref?: unknown }).ref;
  const propRef = props.ref;
  if (elementRef && propRef) {
    mergedProps.ref = composeRefs(propRef, elementRef);
  } else if (elementRef) {
    mergedProps.ref = elementRef;
  }

  return mergedProps;
};

export const renderComboboxElement = <Props extends RenderPartProps, State>(
  render: ComboboxRenderProp<Props, State> | undefined,
  props: Props,
  state: State
) => {
  if (typeof render === 'function') {
    return render(props, state);
  }

  if (isValidElement(render)) {
    return cloneElement(render, mergeElementProps(render, props));
  }

  return null;
};
