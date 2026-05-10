import type React from 'react';

type PreventableReactEvent = React.SyntheticEvent & {
  comboboxHandlerPrevented?: boolean;
  preventComboboxHandler?: () => void;
};

export const getPreventableEvent = (
  event: React.SyntheticEvent
): PreventableReactEvent => {
  const preventableEvent = event as PreventableReactEvent;
  preventableEvent.preventComboboxHandler = () => {
    preventableEvent.comboboxHandlerPrevented = true;
  };
  return preventableEvent;
};

export const isComboboxHandlerPrevented = (event: React.SyntheticEvent) =>
  Boolean((event as PreventableReactEvent).comboboxHandlerPrevented);

export const callIfFunction = <EventType extends React.SyntheticEvent>(
  handler: ((event: EventType) => void) | undefined,
  event: EventType
) => {
  handler?.(event);
};

const composeEventHandlers =
  <EventType extends React.SyntheticEvent>(
    firstHandler: ((event: EventType) => void) | undefined,
    secondHandler: ((event: EventType) => void) | undefined
  ) =>
  (event: EventType) => {
    getPreventableEvent(event);
    callIfFunction(firstHandler, event);
    callIfFunction(secondHandler, event);
  };

const isEventHandlerProp = (key: string) => /^on[A-Z]/.test(key);

const mergeStyles = (
  firstStyle: React.CSSProperties | undefined,
  secondStyle: React.CSSProperties | undefined
) =>
  firstStyle || secondStyle
    ? {
        ...firstStyle,
        ...secondStyle,
      }
    : undefined;

export const mergeRenderElementProps = (
  renderProps: object,
  elementProps: object
) => {
  const renderPropRecord = renderProps as Record<string, unknown>;
  const elementPropRecord = elementProps as Record<string, unknown>;
  const mergedProps = { ...renderPropRecord, ...elementPropRecord };

  for (const [key, renderValue] of Object.entries(renderPropRecord)) {
    const elementValue = elementPropRecord[key];

    if (key === 'className') {
      mergedProps[key] = [renderValue, elementValue].filter(Boolean).join(' ');
      continue;
    }

    if (key === 'style') {
      mergedProps[key] = mergeStyles(
        renderValue as React.CSSProperties | undefined,
        elementValue as React.CSSProperties | undefined
      );
      continue;
    }

    if (
      isEventHandlerProp(key) &&
      typeof renderValue === 'function' &&
      typeof elementValue === 'function'
    ) {
      mergedProps[key] = composeEventHandlers(
        renderValue as (event: React.SyntheticEvent) => void,
        elementValue as (event: React.SyntheticEvent) => void
      );
    }
  }

  return mergedProps;
};

export const setRef = <Node>(
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
