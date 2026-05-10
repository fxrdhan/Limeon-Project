# Combobox

`@/components/combobox` exports the local PharmaSys combobox primitive plus app presets:

```tsx
import { Combobox, PharmaEntityComboboxSelect } from '@/components/combobox';
```

The primitive is a focused Base-UI-like engine owned by this repo. It covers the current PharmaSys needs: single-select values, controlled/uncontrolled open state, controlled search input, filtering, keyboard navigation, cancelable event details, hidden form values, and render-prop parts.

Popup placement is delegated to Floating UI through `Combobox.Positioner`. The combobox still owns value state, item highlighting, search, keyboard behavior, form integration, and the app preset animations.

Implementation is split by ownership:

- `primitive.tsx` owns the public compound namespace and root provider shell.
- `primitive-root-state.ts` owns root state, filtering, option registry, value changes, and hidden form value derivation.
- `primitive-hidden-input.tsx` owns the native hidden input used for form submission.
- `primitive-label.tsx`, `primitive-trigger.tsx`, `primitive-value.tsx`, and `primitive-input.tsx` own the individual control parts and their keyboard/event handlers.
- `primitive-items.tsx` owns list, collection, item rendering, item registration, item indicators, empty state, and status.
- `primitive-popup.tsx` owns portal rendering, popup focus, and Floating UI positioning.
- `primitive-context.ts` and `utils/primitive-*` hold shared context, event details, keyboard math, outside press handling, positioning, and render-prop merging.
- `presets.tsx`, `components/*`, `hooks/*`, and `utils/preset-*` compose the PharmaSys app select UX, including popup content, search, highlighting, validation, and hover-detail layout on top of the primitive.

## Primitive Parts

```tsx
<Combobox.Root
  items={suppliers}
  value={selectedSupplier}
  onValueChange={setSelectedSupplier}
  itemToStringLabel={supplier => supplier.name}
  itemToStringValue={supplier => supplier.id}
  name="supplier_id"
  autoHighlight
>
  <Combobox.Label>Supplier</Combobox.Label>
  <Combobox.Trigger>
    <Combobox.Value placeholder="-- Pilih Supplier --" />
  </Combobox.Trigger>
  <Combobox.Portal>
    <Combobox.Positioner>
      <Combobox.Popup>
        <Combobox.Input aria-label="Cari supplier" placeholder="Cari..." />
        <Combobox.List<(typeof suppliers)[number]>>
          {(supplier, index) => (
            <Combobox.Item key={supplier.id} value={supplier} index={index}>
              {supplier.name}
            </Combobox.Item>
          )}
        </Combobox.List>
        <Combobox.Empty>Tidak ada data</Combobox.Empty>
      </Combobox.Popup>
    </Combobox.Positioner>
  </Combobox.Portal>
</Combobox.Root>
```

Available parts:

- `Combobox.Root`
- `Combobox.Label`
- `Combobox.Trigger`
- `Combobox.Value`
- `Combobox.Portal`
- `Combobox.Positioner`
- `Combobox.Popup`
- `Combobox.Input`
- `Combobox.List`
- `Combobox.Collection`
- `Combobox.Item`
- `Combobox.ItemIndicator`
- `Combobox.Empty`
- `Combobox.Status`

`Combobox.Portal` renders into `document.body` by default. Pass `container` when a real call-site needs the popup mounted under a different DOM root.

`Combobox.Positioner` matches the trigger width by default and uses `placement="bottom-start"`. Pass `matchAnchorWidth={false}` when the popup content owns a custom width; the positioner will keep the popup at least as wide as the trigger while letting Floating UI shift the wider content inside the available viewport. Pass `placement` when a composition needs a different preferred Floating UI placement.

## Root API

`Combobox.Root<Value>` supports the local subset used by PharmaSys:

- `items`, `filteredItems`
- `value`, `defaultValue`, `onValueChange`
- `open`, `defaultOpen`, `onOpenChange`
- `inputValue`, `defaultInputValue`, `onInputValueChange`, `autoComplete`
- `highlightedIndex`, `defaultHighlightedIndex`, `onHighlightedIndexChange`
- `onItemHighlighted`
- `filter`
- `itemToStringLabel`, `itemToStringValue`, `isItemEqualToValue`, `isItemDisabled`
- `labelId`
- `name`, `form`, `disabled`, `readOnly`, `required`
- `autoHighlight`, `highlightItemOnHover`

Change callbacks receive cancelable event details with `reason`, `event`, `cancel()`, and `isCanceled`.

`itemToStringValue` must return a stable unique submitted value for every option that can appear in the same list. The primitive uses that value for hidden form submission, while the preset also relies on it for item keys and entity/id bridging.

When a popup is open, pressing outside both the trigger and the portaled popup requests close with reason `outside-press`. Moving focus outside both nodes, including with Tab, requests close with reason `focus-out`. Controlled `open` callers and `details.cancel()` still decide whether that close request takes effect.

`autoComplete` sets the default native `autocomplete` attribute for `Combobox.Input`. A direct `autoComplete` prop on `Combobox.Input` wins over the root default.

Trigger and popup search keyboard navigation covers ArrowUp/ArrowDown, PageUp/PageDown, Home/End on the trigger, Enter selection, and Escape close.

`Combobox.Input` defaults to `role="searchbox"` for the supported trigger-plus-popup-search composition. Its text value is owned by `Combobox.Root` through `inputValue` / `defaultInputValue`; pass `onInputValueChange` to the root instead of `value` or `defaultValue` to the input. Do not treat the input alone as a full standalone combobox unless the missing open/focus behavior is added for a real call-site.

`name` and `form` render a hidden input for submission. `required` is primitive state consumed by the app preset and validation integrations; it is not implemented through native hidden-input constraint validation. Use `PharmaComboboxSelect` validation for required user feedback.

The local primitive intentionally does not aim to mirror every upstream combobox feature. Add behavior only when a real PharmaSys call-site needs it.

When the popup is open, the primitive trigger supports the local keyboard set used by PharmaSys: Arrow navigation, Home/End, PageUp/PageDown, Enter/Space selection, Escape close, and basic typeahead. The popup search input keeps normal text-entry ownership, handles list navigation keys, and lets Enter select the active option before the preset falls back to a create action with no active option.

The preset keeps search local and in-memory. It precomputes normalized search entries when `items` or `itemToStringLabel` changes, then ranks matches on each query by exact match, prefix match, word prefix match, substring match, acronym/consonant/subsequence match, and typo-fuzzy fallback. Typo-fuzzy results are only used when deterministic tiers return no matches, so exact/prefix results do not get polluted by loose typo candidates. For very large datasets, keep the default behavior unbounded unless a real call-site needs a cap; use `visibleItemLimit` as an opt-in render guardrail. The limit only caps rendered visible options, still scans all provided items for exact-create checks, and keeps the selected option visible when it would otherwise fall outside the cap. Do not add virtualization to the app preset without a call-site that needs that extra behavior.

## Render Props

DOM-rendering parts accept `render={element}` or `render={(props, state) => element}`. Internal ARIA attributes, refs, handlers, class names, styles, and children are passed through the render props.

```tsx
<Combobox.Trigger
  render={(props, state) => (
    <button {...props} data-open={state.open}>
      <Combobox.Value placeholder="Choose" />
    </button>
  )}
/>
```

Stable local `data-*` states include `data-selected`, `data-highlighted`, `data-disabled`, and `data-placeholder` where relevant.

`Combobox.Popup initialFocus` focuses the first focusable popup control only when explicitly enabled.

`highlightedIndex` controls the primitive highlighted option declaratively. Use it for advanced compositions that need to synchronize visual and semantic highlight state.

## App Preset

Use the entity preset when a standard id-backed PharmaSys select is needed:

```tsx
<PharmaEntityComboboxSelect
  label="Kategori"
  name="category_id"
  items={categories}
  valueId={formData.category_id}
  onValueIdChange={value => updateField('category_id', value)}
  placeholder="Pilih Kategori"
  required
  validation={{ enabled: true, autoHide: true, autoHideDelay: 3000 }}
  createAction={{ onCreate: openCategoryModal, label: 'Tambah baru' }}
/>
```

If the selected id can outlive the current option list, pass `selectedItem` when available. The scalar `valueId` is still preserved for hidden form submission and required validation while options are loading. When no matching option or `selectedItem` is available, the trigger uses a neutral fallback label while keeping the raw id submitted; `selectedItem` keeps that temporary gap fully human-readable.

```tsx
<PharmaEntityComboboxSelect
  name="supplier_id"
  items={supplierOptions}
  valueId={supplierId}
  selectedItem={selectedSupplier}
  onValueIdChange={setSupplierId}
/>
```

Use the generic app preset directly when values are not `id`/`name` entities or when the caller needs full control over stringification and equality. For object values, pass `isItemEqualToValue` when selected values can be different references with the same semantic id.

```tsx
<PharmaComboboxSelect
  name="supplier_id"
  items={suppliers}
  value={selectedSupplier}
  onValueChange={setSelectedSupplier}
  itemToStringLabel={supplier => supplier.name}
  itemToStringValue={supplier => supplier.id}
  isItemEqualToValue={(item, value) => item.id === value.id}
  renderOption={(supplier, state) => <span>{state.label}</span>}
  renderOptionMeta={supplier => supplier.code}
/>
```

Enum/list-only selects should pass primitive values directly:

```tsx
<PharmaComboboxSelect
  name="payment_status"
  items={['unpaid', 'partial', 'paid']}
  value={status}
  onValueChange={value => value && setStatus(value)}
  itemToStringLabel={value => labels[value]}
  itemToStringValue={value => value}
  searchable={false}
  indicator="radio"
/>
```

When the preset is not wrapped by `FormField` or another visible label, pass `label`. The trigger uses that label plus the current value for its accessible name while keeping the same visual output.

When wrapped by `FormField`, including through layout wrappers, the preset inherits the field label automatically.

`popupClassName` only customizes the popup surface classes. Pass `popupMatchAnchorWidth={false}` when a preset popup intentionally owns a custom content width wider or narrower than the trigger.

If a scalar select uses a non-null empty sentinel such as `''`, pass `isValueEmpty` so required validation and selection state still treat it as empty:

```tsx
<PharmaComboboxSelect
  name="status"
  items={['active', 'inactive']}
  value={status}
  onValueChange={value => setStatus(value ?? '')}
  itemToStringLabel={value => labels[value] ?? value}
  itemToStringValue={value => value}
  isValueEmpty={value => value === ''}
  required
/>
```

## Preset Behavior Contract

`PharmaComboboxSelect` is the production app adapter. The local primitive owns ARIA roles, focus/reference wiring, option registry, keyboard navigation, highlighted option state, selected value state, hidden form value, filtered item rendering, and cancelable callback details.

The preset owns:

- Search query state and filtered item lists passed into the primitive through `filteredItems`.
- Entity ID bridging, required validation overlay, create action, localized copy, visual styling, and hover detail.
- The animated visual highlight background, including hover continuity, keyboard scroll pinning, wrap-to-edge scroll behavior, stationary-pointer suppression, and the selected/default visual anchor after search is cleared.
- The popup search input's visual active state. Arrow navigation may keep DOM focus on the input, but it must not make the search field look actively focused unless the user is typing or pointing at the input.

The shared boundary is item highlighting. The primitive owns the semantic highlighted index. The preset controls that index declaratively through `highlightedIndex` and renders the existing animated visual background from it. Searchable and non-searchable presets keep their semantic active descendant aligned with the visible highlight anchor.

Rules for maintaining this boundary:

- Do not let the visual background directly change submitted value or selection. Selection must still happen through primitive item press or keyboard handling.
- Preset keyboard navigation must continue from the visible highlight anchor through the primitive controlled highlighted index.
- Clearing search must restore the visual highlight to the selected enabled item when it is visible, otherwise to the first enabled visible item.
- Keyboard scroll and pointer hover must remain arbitrated by the preset so a stationary cursor does not steal highlight while Arrow navigation scrolls the list.
- `value`/`valueId` is the selected value source of truth. `inputValue` is only the transient search query and is cleared when the popup actually closes.
- Outside pointer dismissal is primitive-owned and must ignore presses inside the trigger or portaled popup.
- Controlled `open` callers own whether a close request takes effect. The preset must not run close cleanup when `onOpenChange(false)` fires but `open` remains `true`.
- `details.cancel()` from primitive callbacks prevents preset side effects for that transition.
- Hover detail must never change selection, focus, or submitted value.

Do not add app-specific props to `Combobox.Root`. Compose app behavior around the primitive parts or extend the preset.

## Test Coverage

Combobox regression coverage is intentionally split by what each runner and file can prove:

- `src/components/combobox/index.test.tsx` covers primitive behavior: value changes, filtering, keyboard selection, disabled items, cancelable event details, controlled highlight state, render props, outside press, and focus-out dismissal.
- `src/components/combobox/primitive-aria-id.test.tsx` covers internal listbox and option id contracts that back `aria-controls` and `aria-activedescendant`.
- `src/components/combobox/primitive-form-state.test.tsx` covers hidden form values, controlled nullable values, read-only state, and input autocomplete defaults.
- `src/components/combobox/primitive-label.test.tsx` covers primitive label/id wiring and listbox labelling contracts.
- `src/components/combobox/primitive-popup.test.tsx` covers primitive portal container wiring, positioner placement API coverage, Floating UI sizing, and initial focus.
- `src/components/combobox/primitive-render-props.test.tsx` covers primitive render-prop prop merging, child passthrough, refs, and internal handler cancellation.
- `src/components/combobox/presets-accessibility.test.tsx` covers app label sources, listbox labelling, fallback accessible names, empty status placement, and omitted-name form behavior.
- `src/components/combobox/presets-create-validation.test.tsx` covers create-action precedence, required validation, and non-null empty sentinel behavior.
- `src/components/combobox/presets-highlight.test.ts` covers pure preset highlight and keyboard-routing helpers.
- `src/components/combobox/presets-search-lifecycle.test.tsx` covers search input reset, controlled popup close behavior, focus restore, trigger typing, and search navigation focus state.
- `src/components/combobox/presets-state.test.tsx` covers cancelable details, disabled options, and non-searchable trigger keyboard state.
- `src/components/combobox/presets.test.tsx` covers the generic PharmaSys preset: visual highlight state, keyboard scroll behavior, filtered option indices, typed option rendering, and cross-call-site preset examples.
- `src/components/combobox/presets-entity.test.tsx` covers id-backed entity select behavior, selected-item fallback, scalar form submission, and unavailable-item fallback safeguards.
- `src/components/combobox/presets-hover-detail.test.tsx` covers hover detail data, fetch failures, unmount cleanup, and controlled-open cleanup boundaries.
- `src/components/combobox/presets-keyboard-scroll.test.tsx` covers low-level preset keyboard scroll and pinned-highlight geometry helpers.
- `@testing-library/user-event` is used for user-facing click/type flows where realistic event order matters. Lower-level `fireEvent` remains acceptable for targeted primitive and edge-case transitions.
- Playwright covers browser-only layout behavior in `tests/playwright/combobox.spec.ts`: the combobox fixture renders the real components, verifies search/select and Tab dismissal still work in Chromium, and verifies Floating UI flips/clamps the portaled fixed popup near the viewport edge.

Useful commands:

```bash
AI_AGENT=codex vp test run --passWithNoTests src/components/combobox/index.test.tsx src/components/combobox/primitive-aria-id.test.tsx src/components/combobox/primitive-form-state.test.tsx src/components/combobox/primitive-label.test.tsx src/components/combobox/primitive-popup.test.tsx src/components/combobox/primitive-render-props.test.tsx src/components/combobox/presets.test.tsx src/components/combobox/presets-accessibility.test.tsx src/components/combobox/presets-create-validation.test.tsx src/components/combobox/presets-entity.test.tsx src/components/combobox/presets-highlight.test.ts src/components/combobox/presets-hover-detail.test.tsx src/components/combobox/presets-keyboard-scroll.test.tsx src/components/combobox/presets-search-lifecycle.test.tsx src/components/combobox/presets-state.test.tsx
PLAYWRIGHT_BASE_URL=http://127.0.0.1:5173 bun run test:e2e -- tests/playwright/combobox.spec.ts
```

The Playwright tests require an already-running VitePlus server. Install the browser binary once with `bunx playwright install chromium` if Playwright reports a missing executable.
