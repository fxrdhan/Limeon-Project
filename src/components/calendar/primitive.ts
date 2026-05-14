import {
  AnimatedDaysGrid,
  CalendarButton,
  CalendarHeader,
  CalendarPortal,
  DaysGrid,
} from './components';
import { CalendarRoot, CalendarTrigger } from './primitive-parts';

export type { CalendarRootProps } from './primitive-parts';

export const CalendarPrimitive = {
  AnimatedGrid: AnimatedDaysGrid,
  Button: CalendarButton,
  Grid: DaysGrid,
  Header: CalendarHeader,
  Portal: CalendarPortal,
  Root: CalendarRoot,
  Trigger: CalendarTrigger,
};
