# Calendar Component Documentation

## Overview

`@/components/calendar` provides the PharmaSys date picker and inline calendar implementation. The component is designed for controlled React forms that need local date-only values, Indonesian month/day labels, native form submission support, accessible keyboard interaction, and bounded date selection.

The module exposes two layers:

- App preset: `Calendar` / `PharmaCalendar`, the recommended component for product screens.
- Primitive API: `CalendarPrimitive`, a compound surface for custom calendar compositions.

Use the app preset for standard date fields. Use the primitive API only when the caller needs custom trigger, portal, header, or grid composition that the preset cannot express.

## Import

```tsx
import Calendar, {
  CalendarPrimitive,
  createCalendarDate,
  formatDateOnlyValue,
  parseDateOnlyValue,
  type CalendarDateValue,
  type CalendarProps,
} from '@/components/calendar';
```

Additional exports:

| Export                            | Description                                                                    |
| --------------------------------- | ------------------------------------------------------------------------------ |
| `Calendar`                        | App preset alias for `PharmaCalendar`.                                         |
| `PharmaCalendar`                  | App preset component.                                                          |
| `CalendarPrimitive`               | Compound primitive parts for custom calendar composition.                      |
| `CalendarRootProps`               | Props for `CalendarPrimitive.Root`.                                            |
| `CalendarProps`                   | Props for the app preset.                                                      |
| `CalendarDateValue`               | Controlled value type: `Date \| null`.                                         |
| `CustomDateValueType`             | Alias for `CalendarDateValue`, kept for callers that use custom date typing.   |
| `CalendarMode`                    | Calendar rendering mode: `'datepicker' \| 'inline'`.                           |
| `CalendarSize`                    | Width preset: `'md' \| 'lg' \| 'xl'`.                                          |
| `CalendarTrigger`                 | Datepicker open trigger: `'click' \| 'hover'`.                                 |
| `CalendarButtonProps`             | Props for the default display input primitive.                                 |
| `CalendarHeaderProps`             | Props for the header primitive.                                                |
| `CalendarHeaderSelectRenderProps` | Render props passed to month and year selector render functions.               |
| `CalendarPortalProps`             | Props for the portal primitive.                                                |
| `DaysGridProps`                   | Props for the day grid primitive.                                              |
| `createCalendarDate`              | Converts a `Date` into the component's local date-only representation.         |
| `formatDateOnlyValue`             | Formats a `Date` as `YYYY-MM-DD` using local year, month, and day.             |
| `parseDateOnlyValue`              | Parses a strict `YYYY-MM-DD` string into a local calendar date.                |
| `getCalendarHeaderModel`          | Returns month/year header options and navigation availability for a view date. |

## Recommended Usage

Use `Calendar` as a controlled component. The selected value is always owned by the caller.

```tsx
import { useState } from 'react';
import Calendar, { type CalendarDateValue } from '@/components/calendar';

function TransactionDateField() {
  const [transactionDate, setTransactionDate] =
    useState<CalendarDateValue>(null);

  return (
    <Calendar
      id="transaction-date"
      name="transaction_date"
      label="Tanggal transaksi"
      placeholder="Pilih tanggal"
      value={transactionDate}
      onChange={setTransactionDate}
    />
  );
}
```

Use `mode="inline"` when the calendar should always be visible and rendered in place.

```tsx
<Calendar
  mode="inline"
  name="expiry_date"
  value={expiryDate}
  onChange={setExpiryDate}
  minDate={new Date(2026, 0, 1)}
  maxDate={new Date(2026, 11, 31)}
/>
```

Use custom children when the datepicker must be opened from an existing button or trigger element.

```tsx
<Calendar value={selectedDate} onChange={setSelectedDate}>
  <button type="button" className="btn-secondary">
    Pilih tanggal
  </button>
</Calendar>
```

When persisting dates as strings, keep storage values in `YYYY-MM-DD` and convert at the boundary.

```tsx
const value = savedDate ? parseDateOnlyValue(savedDate) : null;

<Calendar
  name="stock_opname_date"
  value={value}
  onChange={date => {
    setSavedDate(date ? formatDateOnlyValue(date) : '');
  }}
/>;
```

## App Preset API

### `CalendarProps`

```ts
export interface CalendarProps {
  id?: string;
  name?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  mode?: 'datepicker' | 'inline';
  size?: 'md' | 'lg' | 'xl';
  trigger?: 'click' | 'hover';
  value: Date | null;
  onChange: (date: Date | null) => void;
  label?: string;
  inputClassName?: string;
  placeholder?: string;
  minDate?: Date;
  maxDate?: Date;
  portalWidth?: string | number;
  readOnly?: boolean;
  disabled?: boolean;
  children?: React.ReactNode;
}
```

| Prop              | Type                       | Default           | Description                                                                                             |
| ----------------- | -------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------- |
| `value`           | `Date \| null`             | required          | Controlled selected date. Only local year, month, and day are meaningful.                               |
| `onChange`        | `(date) => void`           | required          | Called with a normalized local calendar date or `null` when cleared from the keyboard.                  |
| `id`              | `string`                   | generated         | Id for the display input or custom trigger. Useful for external labels.                                 |
| `name`            | `string`                   | undefined         | Creates a hidden native input submitted as `YYYY-MM-DD`.                                                |
| `aria-label`      | `string`                   | undefined         | Accessible name override for the default display input.                                                 |
| `aria-labelledby` | `string`                   | undefined         | Accessible label reference override for the default display input.                                      |
| `mode`            | `'datepicker' \| 'inline'` | `'datepicker'`    | `datepicker` renders a trigger and portal dialog. `inline` renders the calendar directly in the layout. |
| `size`            | `'md' \| 'lg' \| 'xl'`     | `'md'`            | Width preset used by the portal and inline container.                                                   |
| `trigger`         | `'click' \| 'hover'`       | by mode           | Interaction that opens the datepicker. Defaults to `click` for datepicker and `hover` for inline mode.  |
| `label`           | `string`                   | undefined         | Visible label for the default display input.                                                            |
| `inputClassName`  | `string`                   | undefined         | Additional class names applied to the default display input.                                            |
| `placeholder`     | `string`                   | `'Pilih tanggal'` | Placeholder for the default display input. Also used as the accessible name when no label is present.   |
| `minDate`         | `Date`                     | undefined         | Inclusive lower bound for selectable dates and navigable months/years.                                  |
| `maxDate`         | `Date`                     | undefined         | Inclusive upper bound for selectable dates and navigable months/years.                                  |
| `portalWidth`     | `string \| number`         | size width        | Explicit width for the portal or inline calendar container. Number values are converted to pixels.      |
| `readOnly`        | `boolean`                  | `false`           | Keeps the current value visible and blocks date changes.                                                |
| `disabled`        | `boolean`                  | `false`           | Disables the trigger, header controls, date controls, and hidden native form value.                     |
| `children`        | `React.ReactNode`          | undefined         | Custom trigger content for `datepicker` mode.                                                           |

### Size Presets

| Size | Width   |
| ---- | ------- |
| `md` | `320px` |
| `lg` | `380px` |
| `xl` | `450px` |

`portalWidth` overrides the preset width. In inline mode, the calendar container also uses `max-width: 100%` so it can shrink with its parent.

## Date Model

Calendar values are local date-only values represented with JavaScript `Date` objects. Time, timezone offset, and timestamp semantics should not be used as business meaning.

Important rules:

- The component reads and compares only local year, month, and day.
- Selected dates passed to `onChange` are normalized through `createCalendarDate`.
- `createCalendarDate` returns a date at local noon to reduce date-boundary issues when the value is later formatted.
- Native form values use `YYYY-MM-DD` through `formatDateOnlyValue`.
- `parseDateOnlyValue` accepts only strict `YYYY-MM-DD` input and throws for invalid dates such as `2026-02-31`.

Use `formatDateOnlyValue` for API payloads that expect date-only strings. Avoid serializing selected values with `toISOString()` unless the receiving API explicitly expects timestamps.

## State Boundary Between Primitive and Preset

The calendar has a smaller state surface than the combobox, but it follows the same boundary principle: the primitive owns generic datepicker mechanics, while the app preset owns PharmaSys composition and default visuals.

`CalendarPrimitive.Root` is responsible for date-only normalization, the displayed month, the highlighted date, date selection and clearing requests, mode-specific open behavior, focus movement, popup positioning, bounds-aware navigation, outside-click dismissal, hover-trigger timing, and context values consumed by primitive parts.

The app preset is a controlled consumer of the primitive, not a second calendar implementation. `PharmaCalendar` wraps `CalendarPrimitive.Root`, renders the default input or custom trigger, renders the portal or inline calendar container, wires the header and animated day grid, and serializes the selected date into a hidden form input when `name` is provided.

Calendar state ownership:

| State or behavior       | Owner                        | Notes                                                                                                |
| ----------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------- |
| Selected value          | Caller                       | `value` is always controlled by the caller. The primitive emits normalized dates through `onChange`. |
| Date-only normalization | Primitive root               | Incoming values, bounds, and selected dates are normalized through local date-only utilities.        |
| Displayed month         | Primitive root               | Synced to the selected value when opening and when controlled values change while open or inline.    |
| Highlighted date        | Primitive root               | Shared by keyboard navigation, hover state, grid active-descendant wiring, and selection.            |
| Open/closing/opening    | Primitive root               | Datepicker mode uses internal open state; inline mode is treated as always open.                     |
| Mode behavior           | Primitive root               | `datepicker` and `inline` differences are centralized in mode behavior, not duplicated in views.     |
| Bounds                  | Primitive root and utilities | Bounds affect selectable days, highlighted movement, header options, and month/year navigation.      |
| Positioning and focus   | Primitive root and portal    | Floating UI positioning, focus restoration, and modal trapping are rooted in primitive hooks.        |
| Header selectors        | Preset composition           | The default header renders `PharmaComboboxSelect` through render props for month and year controls.  |
| Hidden form value       | Preset and default button    | Form serialization uses `formatDateOnlyValue`; disabled calendars disable the hidden input.          |
| Styling                 | Preset and SCSS              | Shared visuals live in `style.scss`; primitive parts expose stable classes and structure.            |

When adding behavior, use this boundary:

- Put generic datepicker mechanics in the primitive root or its hooks.
- Put PharmaSys default composition in `presets.tsx`, including header selector choices, default trigger markup, hidden input placement, and inline-vs-portal layout.
- Put pure date calculations in `utils/calendarUtils.ts` or `components/calendarHeaderModel.ts`.
- Keep `CalendarHeader` render-prop based so the preset can use combobox selectors without making the primitive depend on combobox.
- Avoid mirroring `displayDate`, `highlightedDate`, or open state in the preset unless a primitive state slot is intentionally being made controllable.

## Selection and Navigation Behavior

In `datepicker` mode:

- Clicking or pressing `Enter` / `Space` on the trigger opens the calendar dialog.
- Selecting a date calls `onChange(date)`, closes the dialog, and restores focus to the trigger.
- Pressing `Backspace` or `Delete` on the trigger clears a non-null value by calling `onChange(null)`.
- Pressing `Escape` closes the dialog and restores focus to the trigger.
- Clicking outside the dialog closes it.

In `inline` mode:

- The calendar is always rendered in place.
- Selecting a date calls `onChange(date)` and keeps the calendar visible.
- The grid is keyboard-focusable unless the calendar is disabled.
- Outside-click handling and modal focus trapping are not enabled.

Bounds behavior:

- Dates before `minDate` or after `maxDate` are disabled.
- Previous/next navigation is disabled when the target month is fully outside the configured bounds.
- Month and year selectors disable options that would create an invalid view.
- Month changes clamp overflow days instead of rolling into the next month. For example, changing January 31 to February displays February, not March.
- If no bounds are provided, the year selector spans 50 years before and 50 years after the displayed year.

## Forms

The visible datepicker input is display-only and does not submit a text value. When `name` is provided, the component renders a hidden input with the selected date formatted as `YYYY-MM-DD`.

```tsx
<form>
  <label htmlFor="delivery-date">Tanggal pengiriman</label>
  <Calendar
    id="delivery-date"
    name="delivery_date"
    value={deliveryDate}
    onChange={setDeliveryDate}
  />
</form>
```

Submission behavior:

- Selected value: `delivery_date=2026-01-15`.
- Empty value: `delivery_date=` when the hidden input is enabled.
- Disabled calendar: hidden input is disabled and excluded from `FormData`.
- Header month/year controls are internal controls and are not submitted.
- Inline date buttons use `type="button"` and do not submit surrounding forms.

## Accessibility

The preset implements accessible names, dialog semantics, focus management, and grid semantics.

- The default display input has `role="combobox"`, `aria-haspopup="dialog"`, `aria-expanded`, and `aria-controls` while the dialog is open.
- If `label` is provided, it is associated with the display input through `htmlFor`.
- If no `label` is provided, the placeholder is used as the accessible name unless `aria-label` or `aria-labelledby` is supplied.
- Datepicker content renders as a `role="dialog"` with the accessible name `Pilih tanggal`.
- Click-triggered datepickers are modal and set `aria-modal="true"`.
- Hover-triggered datepickers are non-modal and do not move focus on pointer hover.
- The days surface uses `role="grid"`, rows, column headers, grid cells, `aria-selected`, and `aria-activedescendant`.
- The selected date remains visible in read-only mode, while date buttons are disabled to prevent changes.
- Background content is isolated from assistive technology while a modal datepicker is open.

## Keyboard Interaction

| Key                                  | Context            | Action                                                                                      |
| ------------------------------------ | ------------------ | ------------------------------------------------------------------------------------------- |
| `Enter` / `Space`                    | Trigger            | Opens the datepicker. If already open and a date is highlighted, selects it.                |
| `Enter`                              | Grid               | Selects the highlighted date.                                                               |
| `Escape`                             | Dialog or grid     | Closes the datepicker and restores focus to the trigger.                                    |
| `Tab`                                | Trigger while open | Closes the datepicker.                                                                      |
| `Tab` / `Shift+Tab`                  | Modal dialog       | Cycles focus through focusable controls inside the dialog.                                  |
| `ArrowLeft` / `ArrowRight`           | Open calendar grid | Moves the highlighted date by one day.                                                      |
| `ArrowUp` / `ArrowDown`              | Open calendar grid | Moves the highlighted date by one week.                                                     |
| `Ctrl+ArrowLeft` / `Ctrl+ArrowRight` | Open calendar grid | Navigates to the previous or next month.                                                    |
| `Ctrl+ArrowUp` / `Ctrl+ArrowDown`    | Open calendar grid | Navigates to the previous or next year.                                                     |
| `Backspace` / `Delete`               | Trigger or dialog  | Clears the current value when it is non-null and the calendar is not read-only or disabled. |

Keyboard navigation respects `minDate` and `maxDate`. Highlight movement is ignored when the target date is outside the configured range.

## Primitive API

`CalendarPrimitive` exposes the lower-level parts used by the preset.

```tsx
import { CalendarPrimitive } from '@/components/calendar';

<CalendarPrimitive.Root value={value} onChange={setValue}>
  <CalendarPrimitive.Trigger>Pick date</CalendarPrimitive.Trigger>
  <CalendarPrimitive.Portal>
    <div>Custom calendar content</div>
  </CalendarPrimitive.Portal>
</CalendarPrimitive.Root>;
```

### Compound Parts

| Part                             | Description                                                                 |
| -------------------------------- | --------------------------------------------------------------------------- |
| `CalendarPrimitive.Root`         | Provides shared state, bounds, trigger behavior, portal state, and actions. |
| `CalendarPrimitive.Trigger`      | Wraps or clones custom trigger content and wires open/close interaction.    |
| `CalendarPrimitive.Button`       | Default display input used by the app preset.                               |
| `CalendarPrimitive.Portal`       | Renders popup content into `document.body` or a custom container.           |
| `CalendarPrimitive.Header`       | Month/year selectors and previous/next month navigation buttons.            |
| `CalendarPrimitive.Grid`         | Calendar day grid. Can be rendered outside root context as a pure grid.     |
| `CalendarPrimitive.AnimatedGrid` | Calendar day grid with month/year transition animation.                     |

### `CalendarPrimitive.Root`

`CalendarPrimitive.Root` accepts `CalendarRootProps`, which match the state and behavior props used by the preset:

| Prop          | Type                       | Description                                                                |
| ------------- | -------------------------- | -------------------------------------------------------------------------- |
| `value`       | `Date \| null`             | Controlled selected date.                                                  |
| `onChange`    | `(date) => void`           | Called when selection changes or the value is cleared.                     |
| `mode`        | `'datepicker' \| 'inline'` | Controls close-on-select, focus trapping, and outside-click behavior.      |
| `size`        | `'md' \| 'lg' \| 'xl'`     | Width preset used by positioning calculations.                             |
| `trigger`     | `'click' \| 'hover'`       | Trigger interaction.                                                       |
| `minDate`     | `Date`                     | Inclusive lower selection bound.                                           |
| `maxDate`     | `Date`                     | Inclusive upper selection bound.                                           |
| `portalWidth` | `string \| number`         | Portal width override.                                                     |
| `readOnly`    | `boolean`                  | Blocks date selection and clearing while preserving current display state. |
| `disabled`    | `boolean`                  | Disables trigger, navigation, and date interaction.                        |
| `children`    | `React.ReactNode`          | Primitive composition.                                                     |

### `CalendarPrimitive.Trigger`

`CalendarPrimitive.Trigger` supports either a native React element child or plain content.

- If the child is a valid React element, the trigger clones it and preserves the child's handlers.
- Native `button` children receive `type="button"` by default to avoid accidental form submission.
- Non-button children receive `role="button"` and a managed `tabIndex`.
- Disabled calendars make custom triggers inert and prevent child click handlers from running.
- The trigger adds `aria-expanded`, `aria-haspopup="dialog"`, and `aria-controls` while the portal is open.

### `CalendarPrimitive.Portal`

By default, the portal renders into `document.body`. Pass `container` to render into another `Element` or `DocumentFragment`, including shadow roots.

```tsx
<CalendarPrimitive.Portal container={portalHost}>
  <CustomCalendarContent />
</CalendarPrimitive.Portal>
```

The portal uses fixed positioning with Floating UI. It flips or shifts when there is not enough viewport space and exposes `drop-down` / `drop-up` classes for styling.

The default dialog label remains `Pilih tanggal`. Custom primitive compositions can provide a more specific accessible name without changing the preset behavior:

```tsx
<CalendarPrimitive.Portal title="Pilih tanggal faktur">
  <CustomCalendarContent />
</CalendarPrimitive.Portal>
```

Use `aria-label`, `aria-labelledby`, or `aria-describedby` when the dialog label or description is owned by custom content.

### `CalendarPrimitive.Header`

`CalendarPrimitive.Header` is render-prop based for month and year controls. The preset uses `PharmaComboboxSelect` for both selectors.

```tsx
<CalendarPrimitive.Header
  displayDate={displayDate}
  onNavigatePrev={handlePrev}
  onNavigateNext={handleNext}
  onMonthChange={setMonth}
  onYearChange={setYear}
  renderMonthSelect={props => <CustomSelect {...props} />}
  renderYearSelect={props => <CustomSelect {...props} />}
/>
```

Both render props receive:

| Field               | Type                              | Description                      |
| ------------------- | --------------------------------- | -------------------------------- |
| `className`         | `string`                          | Calendar class for the selector. |
| `label`             | `string`                          | Selector label.                  |
| `items`             | `number[]`                        | Month indexes or year values.    |
| `value`             | `number`                          | Current month index or year.     |
| `onValueChange`     | `(value: number \| null) => void` | Change handler.                  |
| `isItemDisabled`    | `(value: number) => boolean`      | Per-option disabled predicate.   |
| `itemToStringLabel` | `(value: number) => string`       | Human-readable label.            |
| `itemToStringValue` | `(value: number) => string`       | Stable string value.             |
| `placeholder`       | `string`                          | Selector placeholder.            |
| `disabled`          | `boolean`                         | Whole-selector disabled state.   |

### `CalendarPrimitive.Grid`

`CalendarPrimitive.Grid` renders a semantic day grid for a single displayed month.

| Prop                  | Type                           | Description                                                            |
| --------------------- | ------------------------------ | ---------------------------------------------------------------------- |
| `displayDate`         | `Date`                         | Month and year to display.                                             |
| `value`               | `Date \| null`                 | Selected date.                                                         |
| `highlightedDate`     | `Date \| null`                 | Keyboard or hover-highlighted date.                                    |
| `minDate` / `maxDate` | `Date`                         | Inclusive selection bounds.                                            |
| `onDateSelect`        | `(date: Date) => void`         | Called when an enabled day is selected.                                |
| `onDateHighlight`     | `(date: Date \| null) => void` | Called on date hover enter/leave.                                      |
| `getDayButtonId`      | `(date: Date) => string`       | Stable id generator used for day buttons and active descendant wiring. |
| `gridTabIndex`        | `number`                       | Tab index for the grid root.                                           |
| `onGridKeyDown`       | `KeyboardEventHandler`         | Keyboard handler for grid navigation.                                  |
| `readOnly`            | `boolean`                      | Disables day buttons while preserving selected state.                  |
| `disabled`            | `boolean`                      | Disables all day interaction.                                          |
| `fixedWeekCount`      | `boolean`                      | Pads the grid to 6 weeks when enabled.                                 |

`CalendarPrimitive.AnimatedGrid` accepts the same grid props plus
`navigationDirection` for horizontal month animation and
`yearNavigationDirection` for vertical year animation.

## Styling

Calendar styles live in `style.scss` and use the `calendar` BEM namespace:

- `.calendar__container`
- `.calendar__button-input`
- `.calendar__header`
- `.calendar__month-select`
- `.calendar__year-select`
- `.calendar__nav-button`
- `.calendar__days-grid--animated`
- `.calendar__day-button`
- `.calendar__custom-trigger`

The preset imports `./style.scss` directly. Consumers usually customize only `inputClassName`, `portalWidth`, or a custom trigger class. Prefer changing the SCSS module when altering shared calendar visuals.

## File Structure

```text
calendar/
├── index.ts
├── presets.tsx
├── primitive.ts
├── primitive-parts.tsx
├── primitive-root-state.ts
├── constants.ts
├── style.scss
├── components/
│   ├── CalendarButton.tsx
│   ├── CalendarHeader.tsx
│   ├── CalendarPortal.tsx
│   ├── AnimatedDaysGrid.tsx
│   ├── DaysGrid.tsx
│   └── calendarHeaderModel.ts
├── hooks/
│   ├── useCalendarDisplayState.ts
│   ├── useCalendarKeyboard.ts
│   ├── useCalendarNavigation.ts
│   ├── useCalendarPosition.ts
│   └── ...
├── providers/
│   └── calendarContext.ts
├── types/
│   ├── components.ts
│   ├── context.ts
│   └── hooks.ts
└── utils/
    └── calendarUtils.ts
```

## Change Route

Use this route map before changing calendar behavior:

| Change target                              | Primary files                                                                                            |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| Public preset API                          | `types/components.ts`, `presets.tsx`, `index.ts`                                                         |
| Primitive root state or state ownership    | `primitive-root-state.ts`, `hooks/useCalendarRoot*`, `types/context.ts`                                  |
| Date-only parsing, formatting, comparison  | `utils/calendarUtils.ts`, `@/lib/formatters`                                                             |
| Bounds, month/year options, header disable | `components/calendarHeaderModel.ts`, `hooks/useCalendarBounds.ts`                                        |
| Month/year navigation behavior             | `hooks/useCalendarNavigation.ts`, `hooks/useCalendarHeaderControls.ts`                                   |
| Selection, clearing, and controlled sync   | `hooks/useCalendarSelection.ts`, `hooks/useCalendarDisplayState.ts`, `hooks/useCalendarRootLifecycle.ts` |
| Keyboard behavior and focus trapping       | `hooks/useCalendarKeyboard.ts`, `hooks/useCalendarFocus.ts`                                              |
| Popup positioning and portal behavior      | `hooks/useCalendarPosition.ts`, `components/CalendarPortal.tsx`                                          |
| Default trigger and form value             | `components/CalendarButton.tsx`, `presets.tsx`                                                           |
| Header selector composition                | `presets.tsx`, `components/CalendarHeader.tsx`                                                           |
| Day grid rendering and animation           | `components/DaysGrid.tsx`, `components/AnimatedDaysGrid.tsx`                                             |
| Shared visual styling                      | `style.scss`                                                                                             |
| Behavior regression coverage               | `presets.test.tsx`, `tests/playwright/calendar.spec.ts`                                                  |

When a change crosses more than one row, update the root/context boundary first so the preset and tests fail at a single typed handoff instead of drifting independently.

## Maintenance Guidelines

- Keep product screens on `Calendar` unless they need custom trigger, portal, header, or grid composition.
- Keep selected values as date-only `Date` objects and store external payloads as `YYYY-MM-DD` strings at the API boundary.
- Keep `value` controlled by the caller; do not add internal selected-value state to the preset.
- Keep open, display, highlight, focus, and positioning behavior in primitive hooks.
- Keep header month/year controls replaceable through render props.
- Prefer pure utility changes for date math and bounds behavior before changing React components.
- Add or update regression coverage when changing keyboard interaction, focus restoration, bounds, form serialization, or portal positioning.

## Testing

The component has coverage in `presets.test.tsx` for the important behavior contracts:

- datepicker open/close and focus restoration,
- inline mode selection,
- controlled value synchronization,
- custom trigger behavior,
- native form date-only submission,
- read-only and disabled states,
- accessible dialog and grid semantics,
- modal background isolation,
- hover-triggered non-modal behavior,
- keyboard navigation and clearing,
- min/max bounds and header model behavior,
- primitive root, trigger, portal, and grid composition.

When changing runtime behavior, run a targeted VitePlus check for the edited files:

```bash
vp check --fix src/components/calendar
```

Documentation-only changes do not require `vp check`.
