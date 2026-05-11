import { CalendarButton, CalendarPortal, DaysGrid } from './components';
import { CalendarRoot, CalendarTrigger } from './primitive-parts';

export type { CalendarRootProps } from './primitive-parts';

export const CalendarPrimitive = {
  Button: CalendarButton,
  Grid: DaysGrid,
  Portal: CalendarPortal,
  Root: CalendarRoot,
  Trigger: CalendarTrigger,
};
