import * as React from 'react';
import { defaultTooltipTransition } from './constants';
import type { TooltipProviderValue, TooltipValue } from './types';

export const TooltipProviderContext = React.createContext<TooltipProviderValue>(
  {
    isProvided: false,
    openDelay: 0,
    closeDelay: 100,
    transition: defaultTooltipTransition,
    showTooltip: () => undefined,
    hideTooltip: () => undefined,
  }
);

export const TooltipContext = React.createContext<TooltipValue | null>(null);
