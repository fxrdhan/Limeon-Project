# Combobox Component

The `Combobox` component is a controlled React component for selecting a single option or multiple options from a `ComboboxOption` list. Its implementation lives in `src/components/combobox`, while the public type contract is exported from `src/types/components.ts`.

## Overview

`Combobox` covers several common PharmaSys form workflows:

- Default single-select for relational fields such as categories, manufacturers, suppliers, statuses, and payment methods.
- Single-select with a radio indicator via `withRadio`.
- Multi-select with checkboxes via `withCheckbox`.
- Client-side search with fuzzy matching, debounced filtering, highlighted results, and an add-new action when no results are found.
- Required validation integrated with `ValidationOverlay`.
- Menu portal rendering to `document.body` so parent containers do not clip the menu.
- Automatic viewport-aware positioning, including manual `top`, `bottom`, and `left` options.
- Hover-detail portal rendering to display option metadata without changing the selection.
- Keyboard navigation, focus management, auto-scroll to the selected option, and virtualization for large lists.
- Base UI-like controlled state hooks for popup open state, search input value, and highlighted item.
- Compound-part exports for advanced composition while keeping the default `<Combobox />` API stable.

## Import

```tsx
import Combobox from '@/components/combobox';
import type { ComboboxOption, HoverDetailData } from '@/types';
```

## File Structure

```txt
combobox/
|-- index.tsx                         # Root orchestrator and public component
|-- constants.ts                      # Timing, keyboard keys, search states, and layout constants
|-- components/
|   |-- ComboboxButton.tsx            # Trigger button
|   |-- ComboboxMenu.tsx              # Portal content orchestrator
|   |-- HoverDetailPortal.tsx         # Option detail popup
|   |-- OptionItem.tsx                # Context adapter for OptionRow
|   |-- SearchBar.tsx                 # Search input and add-new action
|   |-- button/                       # Combobox-specific button primitive
|   |-- menu/                         # Portal, content wrapper, empty state, scroll indicators
|   |-- options/                      # Option row, radio indicator, checkbox indicator
|   `-- search/                       # Search input, icon, add-new button
|-- hooks/
|   |-- useComboboxState.ts           # Open, close, closing animation, active combobox singleton
|   |-- useComboboxSearch.ts          # Search term, debounce, filter, sort, search state
|   |-- useComboboxValidation.ts      # Required validation state
|   |-- useComboboxPosition.ts        # Portal positioning and width calculation
|   |-- useKeyboardNavigation.ts      # Arrow, PageUp, PageDown, Enter, Escape, and Tab close handling
|   |-- useFocusManagement.ts         # Focus-out close and delayed focus handling
|   |-- useScrollManagement.ts        # Scroll indicators and selected-option restoration
|   |-- useComboboxEffects.ts         # Open side effects, hover-to-open, listeners
|   |-- useComboboxVirtualization.ts   # Windowed rendering for large option lists
|   |-- useHoverDetail.ts             # Hover detail visibility, fetch, suppression
|   `-- useTextExpansion.ts           # Truncated text expansion state
|-- providers/
|   |-- ComboboxContext.tsx
|   `-- comboboxContext.ts
|-- types/
|   |-- components.ts
|   |-- context.ts
|   |-- hooks.ts
|   `-- index.ts
`-- utils/
    `-- comboboxUtils.ts              # Search scoring, sorting, match ranges, icon color
```

## Data Model

### ComboboxItem and ComboboxOption

```ts
export interface ComboboxItem {
  id: string;
  name: string;
}

export interface ComboboxOption extends ComboboxItem {
  code?: string;
  description?: string;
  metaLabel?: string;
  metaTone?: 'default' | 'info' | 'success' | 'warning';
  updated_at?: string | null;
}
```

`ComboboxItem` is the primitive identity contract: `id` is the value passed to `onChange`, and `name` is the primary label. `ComboboxOption` extends that core shape with optional display/detail metadata used by search display, the small badge on the trigger, hover detail, and the base payload before `onFetchHoverDetail` resolves.

### HoverDetailData

```ts
export interface HoverDetailData extends ComboboxItem {
  code?: string;
  description?: string;
  metaLabel?: string;
  metaTone?: 'default' | 'info' | 'success' | 'warning';
  created_at?: string;
  updated_at?: string | null;
}
```

## API Props

### Single Selection

```ts
export interface ComboboxProps {
  id?: string;
  children?: React.ReactNode;
  mode?: 'input' | 'text';
  options: ComboboxOption[];
  value: string;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean, details: ComboboxOpenChangeDetails) => void;
  inputValue?: string;
  onInputValueChange?: (
    value: string,
    details: ComboboxInputValueChangeDetails
  ) => void;
  highlightedValue?: string;
  onHighlightedValueChange?: (
    value: string | undefined,
    details: ComboboxHighlightChangeDetails
  ) => void;
  tabIndex?: number;
  onChange: (value: string, details: ComboboxValueChangeDetails) => void;
  onValueChange?: (value: string, details: ComboboxValueChangeDetails) => void;
  placeholder?: string;
  name: string;
  form?: string;
  required?: boolean;
  disabled?: boolean;
  onAddNew?: (searchTerm?: string) => void;
  persistOpen?: boolean;
  onPersistOpenClear?: () => void;
  freezePersistedMenu?: boolean;
  withRadio?: boolean;
  searchList?: boolean;
  autoScrollOnOpen?: boolean;
  validate?: boolean;
  showValidationOnBlur?: boolean;
  validationAutoHide?: boolean;
  validationAutoHideDelay?: number;
  hoverToOpen?: boolean;
  portalWidth?: string | number;
  position?: 'auto' | 'top' | 'bottom' | 'left';
  align?: 'left' | 'right';
  enableHoverDetail?: boolean;
  hoverDetailDelay?: number;
  onFetchHoverDetail?: (optionId: string) => Promise<HoverDetailData | null>;
  'aria-label'?: string;
  'aria-labelledby'?: string;
}
```

### Multiple Selection

```ts
export interface CheckboxComboboxProps extends Omit<
  ComboboxProps,
  'value' | 'onChange' | 'withRadio'
> {
  value: string[];
  onChange: (value: string[], details: ComboboxValueChangeDetails) => void;
  onValueChange?: (
    value: string[],
    details: ComboboxValueChangeDetails
  ) => void;
  withCheckbox: true;
}
```

`withCheckbox` changes the `value` and `onChange` contract to arrays. `withRadio` only changes the visual affordance of single-select mode and does not change the value type.

The `name` prop is mirrored to visually hidden native form input(s). Single-select mode renders one input with the selected id, while checkbox mode renders one input per selected id. Empty required checkbox mode renders one empty required input that remains eligible for native constraint validation.

Change handlers receive Base UI-like `details` objects with `reason`, `event`, `trigger`, `cancel()`, `allowPropagation()`, `isCanceled`, and `isPropagationAllowed`. `cancel()` prevents the combobox from applying follow-up internal behavior for cancelable open, input, and value changes. Escape key propagation is stopped by default; call `details.allowPropagation()` in `onOpenChange` for `reason === 'escape-key'` when parent popups should also handle Escape.

### Compound Exports

The default export remains the recommended app-level API. Advanced consumers can import Base UI-like parts from `@/components/combobox/exports`:

```tsx
import {
  ComboboxRoot,
  ComboboxTrigger,
  ComboboxPopup,
  ComboboxList,
  ComboboxListItem,
  ComboboxSearch,
  ComboboxHoverDetail,
  ComboboxProvider,
  useComboboxContext,
} from '@/components/combobox/exports';
```

These parts consume `ComboboxRoot` context and can be used as children when the default trigger/popup layout is not enough:

```tsx
<ComboboxRoot
  name="supplier_id"
  value={supplierId}
  onChange={setSupplierId}
  options={suppliers}
>
  <ComboboxTrigger
    render={(props, state) => <button {...props} data-open={state.open} />}
  />
  <ComboboxPopup>
    <ComboboxSearch />
    <ComboboxList />
  </ComboboxPopup>
</ComboboxRoot>
```

`ComboboxTrigger`, `ComboboxPopup`, `ComboboxSearch`, `ComboboxList`, and `ComboboxListItem` accept `className`, `style`, and `render` props for Base UI-like root element composition. `render` may be a function or a React element; element render overrides are cloned with the internal ARIA, data attributes, handlers, and children merged in. Element render handlers run before internal handlers, and calling `event.preventDefault()` skips the matching internal handler.

## Defaults

| Prop                   | Default         | Notes                                                                                 |
| ---------------------- | --------------- | ------------------------------------------------------------------------------------- |
| `mode`                 | `'input'`       | Trigger renders like a form control.                                                  |
| `placeholder`          | `'-- Pilih --'` | Displayed when no option is selected.                                                 |
| `persistOpen`          | `false`         | The menu normally closes after a single option is selected or on outside interaction. |
| `freezePersistedMenu`  | `false`         | When `true`, the portal remains visible but becomes non-interactive.                  |
| `searchList`           | `true`          | Shows the search input at the top of the menu.                                        |
| `autoScrollOnOpen`     | `true`          | Scrolls the list to the selected option on first open.                                |
| `required`             | `false`         | Enables required validation in the hook.                                              |
| `disabled`             | `false`         | Disables the trigger and interaction handlers.                                        |
| `validate`             | `false`         | Renders `ValidationOverlay` when an error should be shown.                            |
| `showValidationOnBlur` | `true`          | Shows the overlay on blur when invalid.                                               |
| `validationAutoHide`   | `true`          | Passed through to `ValidationOverlay`.                                                |
| `portalWidth`          | `'auto'`        | Width follows the trigger.                                                            |
| `position`             | `'auto'`        | Chooses above or below based on viewport space.                                       |
| `align`                | `'right'`       | The portal's right edge aligns with the trigger's right edge.                         |
| `enableHoverDetail`    | `false`         | Hover detail is disabled unless explicitly requested.                                 |
| `hoverDetailDelay`     | `800`           | Initial delay before the detail appears.                                              |

## Basic Usage

### Single Select

```tsx
const [supplierId, setSupplierId] = useState('');

const suppliers: ComboboxOption[] = [
  { id: 'supplier-a', name: 'Supplier A' },
  { id: 'supplier-b', name: 'Supplier B' },
];

<Combobox
  name="supplier_id"
  value={supplierId}
  onChange={setSupplierId}
  options={suppliers}
  placeholder="-- Select Supplier --"
/>;
```

### Radio Style Single Select

Use `withRadio` for enum-like choices that do not need search.

```tsx
<Combobox
  name="payment_status"
  value={paymentStatus}
  onChange={setPaymentStatus}
  options={[
    { id: 'unpaid', name: 'Unpaid' },
    { id: 'partial', name: 'Partial' },
    { id: 'paid', name: 'Paid' },
  ]}
  withRadio
  searchList={false}
/>
```

### Checkbox Multi Select

```tsx
const [selectedIds, setSelectedIds] = useState<string[]>([]);

<Combobox
  name="visible_columns"
  value={selectedIds}
  onChange={setSelectedIds}
  options={columnOptions}
  withCheckbox
/>;
```

In checkbox mode, clicking an option toggles the item in the array and the menu remains open so users can select multiple options.

### Text Mode for Compact Controls

`mode="text"` is used for compact triggers such as month and year selectors in the calendar header.

```tsx
<Combobox
  mode="text"
  portalWidth="120px"
  position="bottom"
  align="left"
  name="month-selector"
  value={month}
  onChange={setMonth}
  options={monthOptions}
  searchList={false}
/>
```

## Validation

Required validation is handled by `useComboboxValidation`.

```tsx
<Combobox
  name="category_id"
  value={categoryId}
  onChange={setCategoryId}
  options={categories}
  placeholder="Select Category"
  required
  validate
  showValidationOnBlur
  validationAutoHide
  validationAutoHideDelay={3000}
/>
```

Important rules:

- `required` checks for an empty value and emits the message `Pilihan harus diisi` (`Selection is required`).
- `validate` is required when the error must be shown through `ValidationOverlay`.
- `required` without `validate` still affects the trigger's error state, but the overlay is not rendered because the root component only renders `ValidationOverlay` when `validate` is `true`.
- Errors are cleared after a valid value is selected.
- For checkbox comboboxes, root validation currently evaluates the array by taking the first value when the array is not empty.

## Search

Search is enabled by default through `searchList={true}`. The flow is:

1. The user types in the search input, or types a printable key on the trigger while the menu is open.
2. `useComboboxSearch` stores `searchTerm` immediately and `debouncedSearchTerm` after `COMBOBOX_CONSTANTS.DEBOUNCE_DELAY` (`150ms`).
3. `filterAndSortOptions` searches options with `includes` or `fuzzyMatch`.
4. Results are sorted by score:
   - exact name match
   - name prefix
   - exact token
   - token prefix
   - token contains
   - name contains
   - fuzzy match
5. `OptionRow` bolds matching characters based on `getComboboxOptionMatchRanges`.

If `searchList={false}`, the search input is not rendered. Keyboard navigation still works on the listbox for navigation keys.

## Add New Flow

`onAddNew` becomes active when search does not find any option and the search term is not empty.

```tsx
<Combobox
  name="manufacturer_id"
  value={manufacturerId}
  onChange={setManufacturerId}
  options={manufacturers}
  onAddNew={term => {
    setInitialManufacturerName(term ?? '');
    setIsManufacturerModalOpen(true);
  }}
/>
```

Users can trigger add-new with:

- the plus button in the search bar,
- `Enter` when the search state is `not-found`,
- `Enter` when the search state is `typing` and the results are still empty.

When add-new is triggered, the root component:

- cancels pending focus,
- blurs the active element,
- pins the combobox so it stays open,
- calls `onAddNew(term)`.

## Persisted and Frozen Menu

The `persistOpen`, `onPersistOpenClear`, and `freezePersistedMenu` props are used when add-new opens a modal but the original combobox must remain in the visual context.

```tsx
<Combobox
  name="category_id"
  value={categoryId}
  onChange={setCategoryId}
  options={categories}
  onAddNew={openCategoryModal}
  persistOpen={persistedComboboxName === 'category_id'}
  freezePersistedMenu={
    isCategoryModalOpen && persistedComboboxName === 'category_id'
  }
  onPersistOpenClear={() => setPersistedComboboxName(null)}
/>
```

Behavior:

- `persistOpen` keeps the menu effectively open even if the internal state closes.
- `freezePersistedMenu` makes the portal non-interactive with `pointer-events-none select-none` and `aria-hidden`.
- Clicking outside the combobox clears the persisted state and closes the menu, unless the click occurs inside a modal with `[role="dialog"][aria-modal="true"]`.
- When another combobox opens, the previously active combobox is closed through the singleton active combobox callback.

## Hover Detail

Hover detail shows an information panel beside the option. The initial data comes from `ComboboxOption`, and it can be enriched through `onFetchHoverDetail`.

```tsx
<Combobox
  name="unit_id"
  value={unitId}
  onChange={setUnitId}
  options={unitOptions}
  enableHoverDetail
  hoverDetailDelay={400}
  onFetchHoverDetail={async id => {
    const unit = await fetchUnitDetail(id);
    return unit
      ? {
          id: unit.id,
          code: unit.code,
          name: unit.name,
          description: unit.description,
          metaLabel: unit.statusLabel,
          metaTone: 'info',
        }
      : null;
  }}
/>
```

Important details:

- The initial delay uses `hoverDetailDelay`; once the portal is visible, switching options updates the data without a long delay.
- The portal is positioned to the right of the option when there is enough space, then falls back to the left.
- When the user scrolls the list, the portal is temporarily hidden and restored after scrolling becomes idle.
- Keyboard highlight can also trigger hover detail immediately if the highlighted option is fully visible in the list viewport.
- `onFetchHoverDetail` must return `HoverDetailData | null`; fetch errors are only logged to the console and do not block the combobox.

## Positioning and Width

Positioning is calculated by `useComboboxPosition` based on the trigger's `getBoundingClientRect()` and the menu size.

| Prop          | Value       | Behavior                                                                                                      |
| ------------- | ----------- | ------------------------------------------------------------------------------------------------------------- |
| `position`    | `'auto'`    | Choose drop-up or drop-down based on available space above and below.                                         |
| `position`    | `'top'`     | Force drop-up.                                                                                                |
| `position`    | `'bottom'`  | Force drop-down.                                                                                              |
| `position`    | `'left'`    | Place the menu to the left of the trigger when there is enough room, otherwise fall back to normal alignment. |
| `align`       | `'right'`   | Align the right edge of the menu with the right edge of the trigger.                                          |
| `align`       | `'left'`    | Align the left edge of the menu with the left edge of the trigger.                                            |
| `portalWidth` | `'auto'`    | Use the same width as the trigger.                                                                            |
| `portalWidth` | `'content'` | Calculate width from the longest option, with a minimum of `120px` and a maximum of `400px`.                  |
| `portalWidth` | `number`    | Use the value as the pixel width.                                                                             |
| `portalWidth` | `string`    | Pass the value through as CSS width, for example `'120px'`.                                                   |

The default portal uses `position: fixed`, except in `position="left"` mode, which uses `absolute`. The portal z-index is `COMBOBOX_CONSTANTS.PORTAL_Z_INDEX` (`1060`).

## Keyboard Interaction

Combobox handles keyboard input in the trigger, the search input, and the list container.

| Key           | Behavior                                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------------------------- |
| `ArrowDown`   | Opens the popup from the trigger when closed, then highlights the next option and wraps to the beginning.     |
| `ArrowUp`     | Opens the popup from the trigger when closed, then highlights the previous option and wraps to the end.       |
| `Home`        | Highlight the first option when the popup is open.                                                            |
| `End`         | Highlight the last option when the popup is open.                                                             |
| `Tab`         | Close the combobox and allow the browser to move focus to the next control. `Shift+Tab` moves focus backward. |
| `PageDown`    | Jump down by `COMBOBOX_CONSTANTS.PAGE_SIZE` (`5`) items.                                                      |
| `PageUp`      | Jump up by 5 items.                                                                                           |
| `Enter`       | Select the highlighted option, or run `onAddNew(searchTerm)` when search returns no results.                  |
| `Space`       | Select the highlighted option when the popup is open without a search input.                                  |
| `Escape`      | Close the combobox, reset expanded text, and stop propagation unless `details.allowPropagation()` is called.  |
| Printable key | If the menu is open and `searchList` is enabled, route the key to the search input.                           |

When keyboard navigation is active, the cursor is hidden inside the combobox area and the list highlight uses a pinned frame so scroll animation does not make the highlight disappear.

## Focus and Close Behavior

Open and close state is split into:

- `isOpen`: the menu is active.
- `isClosing`: the close animation is still running.
- `applyOpenStyles`: the scale/opacity class may be applied after position is ready.
- `effectiveIsOpen`: `isOpen || persistOpen || pinnedOpen`.

Close occurs in these cases:

- clicking the trigger while the menu is open,
- selecting a single option,
- `Escape`,
- focus leaving the combobox when it is not persisted,
- pointer down outside the combobox while it is persisted but not frozen,
- another combobox opening.

When the menu is open, `useComboboxEffects` temporarily sets `document.body.style.overflow = 'hidden'`, restores the previous inline overflow value on close, and registers `scroll`, `resize`, and `focusout` listeners to keep positioning and close behavior stable.

## Scroll and Virtualization

`useScrollManagement` handles:

- detecting whether the list is scrollable,
- top and bottom indicators through `ScrollIndicators`,
- initial scroll to the selected option when `autoScrollOnOpen=true`,
- scrolling back to the top when search produces filtered results,
- restoring scroll to the selected option after search is cleared.

Virtualization is enabled automatically when the number of results is greater than `COMBOBOX_CONSTANTS.VIRTUALIZATION_THRESHOLD` (`100`). `useComboboxVirtualization`:

- estimates item height with `OPTION_ESTIMATED_HEIGHT` (`36`),
- measures the actual height of rendered items,
- renders only the visible window plus an overscan of `6`,
- still provides a scroll target for keyboard navigation.

## Internal Data Flow

```txt
props
  -> index.tsx
      -> useComboboxState
      -> useComboboxSearch
      -> useComboboxValidation
      -> useComboboxPosition
      -> useKeyboardNavigation
      -> useFocusManagement
      -> useScrollManagement
      -> useComboboxEffects
      -> useHoverDetail
  -> ComboboxProvider
      -> ComboboxButton
      -> ComboboxMenu
          -> SearchBar
          -> MenuContent
          -> OptionItem
              -> OptionRow
      -> ValidationOverlay
      -> HoverDetailPortal
```

The state needed by child components is shared through `ComboboxContext`. The root still owns the main event handlers so selection, search, validation, positioning, and close behavior do not spread through prop drilling.

## Accessibility Notes

- The trigger is exposed as the single field-level `role="combobox"` with `aria-expanded`, `aria-haspopup`, `aria-controls`, and `aria-activedescendant` when an option is highlighted.
- The popup wrapper uses `role="dialog"` only for the input-inside-popup pattern. Without the search input, the wrapper is presentational and the options container owns the `role="listbox"` semantics.
- The search input inside the popup remains a labelled text filter with `aria-autocomplete="list"` and points at the listbox without creating a second combobox role.
- When a parent label is available, pass `aria-labelledby` or use `FormField`; the trigger combines the field label with the current visible value for a stable accessible name.
- Listbox and option IDs are generated per combobox instance so multiple comboboxes do not share ARIA targets.
- Options use `role="option"`, `aria-selected`, `aria-posinset`, `aria-setsize`, and Base UI-like data attributes such as `data-selected` and `data-highlighted`.
- Option buttons are removed from the tab order with `tabIndex={-1}` so keyboard focus stays on the trigger, search input, or listbox container.
- The disabled trigger uses the native `disabled` attribute.
- Keyboard support is available for navigation and selection.

Note: the popup and listbox roles are intentionally split. If you change the accessibility markup, verify keyboard behavior, tests, and screen reader semantics together.

## Constants

The main values live in `constants.ts`.

| Constant                   | Value  | Purpose                                                     |
| -------------------------- | ------ | ----------------------------------------------------------- |
| `ANIMATION_DURATION`       | `100`  | Duration of the close state before the menu DOM is removed. |
| `CLOSE_TIMEOUT`            | `200`  | Close delay for hover-to-open leave intent.                 |
| `HOVER_TIMEOUT`            | `100`  | Delay before hover opens the combobox.                      |
| `DEBOUNCE_DELAY`           | `150`  | Debounce delay for the search term.                         |
| `FOCUS_DELAY`              | `50`   | Delay before focusing the list on open without search.      |
| `VIEWPORT_MARGIN`          | `16`   | Safe margin between the portal and the viewport edge.       |
| `MAX_HEIGHT`               | `240`  | Maximum list height (`max-h-60`).                           |
| `PAGE_SIZE`                | `5`    | Step size for PageUp/PageDown.                              |
| `VIRTUALIZATION_THRESHOLD` | `100`  | Threshold for enabling virtualization.                      |
| `VIRTUALIZATION_OVERSCAN`  | `6`    | Extra items rendered outside the viewport.                  |
| `OPTION_ESTIMATED_HEIGHT`  | `36`   | Estimated height for virtualized items.                     |
| `PORTAL_Z_INDEX`           | `1060` | Combobox portal layer.                                      |

## Testing

Related tests live in:

- `src/components/combobox/index.test.tsx`
- `src/components/combobox/utils/comboboxUtils.test.ts`
- `src/components/combobox/hooks/useComboboxVirtualization.test.tsx`
- `src/components/combobox/hooks/useKeyboardNavigation.test.tsx`
- `src/components/combobox/hooks/useHoverDetail.test.tsx`
- `src/components/combobox/hooks/useScrollManagement.test.tsx`

Run tests through VitePlus:

```bash
AI_AGENT=codex vp test run --passWithNoTests src/components/combobox
```

For runtime or type changes, run the repo-standard check:

```bash
vp check --fix src/components/combobox
```

Documentation-only changes do not require `vp check`.

## Implementation Guidelines

- Treat `Combobox` as a controlled component. The parent must own `value` and update it through `onChange`.
- Use `ComboboxOption.id` as the stable value. Do not use the label as the id if the label can change.
- Use `searchList={false}` for small enum-like options such as statuses or month/year selectors.
- Use `withRadio` for single-select controls that need to show the active choice visually.
- Use `withCheckbox` only when the parent actually stores an array of ids.
- For required fields that need an error overlay, pass `required` and `validate`.
- For add-new workflows with a modal, coordinate `onAddNew`, `persistOpen`, `freezePersistedMenu`, and `onPersistOpenClear`.
- Do not place network fetches directly in option rendering. Use `onFetchHoverDetail` so fetching only happens when detail is requested.
- Avoid exporting new helpers from a React component file. Follow the Fast Refresh rule by moving shared non-component exports into a sibling module.
