# Combobox Perfect Target

This document defines the target state for making the PharmaSys combobox
"perfect" as an internal component without changing the current UX, visuals, or
animation behavior in any observable way.

## Prime Directive

The perfecting track is a zero-UX-delta hardening track.

Do not change:

- Trigger size, spacing, radius, border, shadow, colors, typography, icon shape,
  icon position, or popup width.
- Popup placement behavior, side offset, viewport clamping, overflow behavior,
  or shadow visibility.
- Search input position, focus appearance, placeholder copy, create button
  placement, or empty state placement.
- Highlight animation timing, spring values, layout ids, pinned-highlight
  timing, smooth scroll behavior, or hover detail transitions.
- Keyboard semantics, pointer semantics, selected/default visual highlight
  anchors, disabled-item skipping, or current wrapping behavior.
- Validation copy, validation timing, overlay behavior, hidden input behavior, or
  create action behavior.

If a change would require updated screenshots, changed Playwright geometry
assertions, changed user-visible copy, changed event order, or changed animation
snapshots, it is out of scope for this target.

## Current Strengths To Preserve

- The component has a clear split between the local primitive and app preset.
- `Combobox.Root` owns value state, open state, input state, filtering,
  highlighted index, item registry, hidden form value, keyboard navigation,
  cancelable event details, and primitive ARIA wiring.
- `PharmaComboboxSelect` owns PharmaSys-specific styling, localized copy,
  validation overlay, create action, hover detail, visual highlight arbitration,
  and search-query filtering.
- `PharmaEntityComboboxSelect` provides the common id-backed entity adapter
  without forcing call-sites to hold full entity objects.
- Browser-only layout concerns are delegated to Floating UI and covered by
  Playwright.
- Regression coverage is unusually strong for this component and should remain
  behavior-focused.

## Perfect Definition

The component is "perfect" for this repo when it meets all of these conditions:

- Public APIs remain compatible with all existing call-sites.
- Existing unit tests and Playwright tests pass without expectation changes that
  weaken behavior.
- No visible UX, layout, copy, or animation changes are introduced.
- Controlled and uncontrolled state contracts are internally correct.
- ARIA relationships are complete for the existing rendered structure.
- Primitive and preset responsibilities are easier to reason about than they are
  now.
- Maintenance does not require dispatching fake DOM pointer events just to
  synchronize semantic highlight state.
- Tests protect the important invariants without asserting brittle internal DOM
  shape beyond explicit component contracts.

## Current Public Surface

Treat these exports as public inside PharmaSys:

- `Combobox` and every compound part exported from `primitive.tsx`.
- `ComboboxRootProps` and callback detail types.
- `findComboboxItemByValue`.
- `PharmaComboboxSelect` and `PharmaComboboxSelectProps`.
- `PharmaEntityComboboxSelect` and `PharmaEntityComboboxSelectProps`.
- The `@/components/combobox` barrel.
- The legacy `exports.ts` re-export path.

Call-site compatibility means more than TypeScript compatibility. Existing
call-sites must keep the same hidden input values, accessible trigger names,
visible labels, option order, selection payloads, popup behavior, and validation
behavior.

## Current Runtime Contracts

These contracts are already relied on by tests or call-sites and must not drift.

### Primitive State

- `value` and `defaultValue` represent selected item objects, not serialized
  strings.
- `name` serializes the selected item through `itemToStringValue` into a hidden
  input.
- Hidden inputs intentionally do not receive native `required`.
- `disabled` disables the hidden input and all items through primitive state.
- `readOnly` prevents trigger toggling and item selection, but does not redesign
  visuals.
- `open` requests are cancelable through `onOpenChange`.
- `value` changes are cancelable through `onValueChange`.
- `inputValue` changes are cancelable through `onInputValueChange`.
- Highlight changes are cancelable through `onItemHighlighted`.
- `details.cancel()` prevents the primitive state change for that transition.
- `selectItem` currently calls `onValueChange` before requesting popup close.
  Do not reorder that without explicit regression coverage.

### Filtering And Indexing

- The primitive can filter from `items` or accept caller-provided
  `filteredItems`.
- The preset owns filtering and passes `visibleItems` into the primitive as
  `filteredItems`.
- Rendered option order, rendered option index, primitive `filteredItems`, and
  `data-pharma-combobox-index` must describe the same list.
- `Combobox.Item index` is semantic state, not a display-only number.
- Disabled-item skipping depends on the item registry keyed by rendered index.
- `itemToStringValue(item)` must be unique within a rendered option list. The
  preset currently uses it as the React key and the hidden submitted value.
- Search matching is trimmed, localized with `id-ID`, and substring-based.
- Create action appears for a non-empty search that has no exact label match,
  even when partial matches exist.

### Highlight And Selection

- Selection and highlight are separate concepts.
- The primitive `activeIndex` is the semantic highlighted option.
- The preset `visualBackgroundValue` is the animated visual anchor.
- A visual background can exist while the primitive has no active descendant,
  especially in non-searchable presets.
- The selected enabled item is the default visual anchor when it is visible.
- If no selected enabled item is visible, the first enabled visible item becomes
  the default visual anchor.
- Clearing search restores the selected/default visual anchor.
- Arrow navigation must continue from the visible visual anchor after the preset
  syncs it back to primitive highlight state.
- Enter from the search input commits the current primitive highlighted item
  unless create action owns Enter for the current search.
- Pointer hover must not steal highlight while keyboard scrolling moves a list
  under a stationary pointer.
- Pointer hover resumes only after pointer movement passes the current threshold.

### Popup And Focus

- Popup content is portaled to `document.body`.
- Floating UI owns popup placement, flip, shift, available-height variables, and
  anchor-width variables.
- Positioner overflow stays visible so popup shadows are not clipped.
- `Combobox.Popup initialFocus` is opt-in. The preset currently keeps it false.
- Searchable preset opens with the search input rendered, but focus behavior and
  visual focus styling remain governed by the current event flow.
- Search query is cleared only when the popup actually closes or a value change
  is accepted.
- Controlled-open callers own whether a close request takes effect. Preset
  cleanup must not run merely because `onOpenChange(false)` fired.
- Outside-dismiss is not current behavior. Adding it is a UX change and not part
  of this track.

### Validation

- Required validation is preset-owned.
- Required validation copy is exactly `Field ini wajib diisi`.
- Required invalid state starts after focus leaves the combobox/popup boundary.
- Moving focus from trigger to portaled popup content must not mark the field
  invalid.
- Validation `aria-describedby` includes caller-provided descriptions and the
  validation message only while invalid.
- `isValueEmpty` lets scalar selects define non-null empty sentinels.
- A `selectedItem` outside the current entity option list still satisfies
  required validation when its id matches `valueId`.

### Hover Detail

- Hover detail is preset-owned and must never affect selection, focus, hidden
  value, or popup open state.
- Base option data is shown before fetched detail data resolves.
- Stale fetches must not overwrite the current hover detail.
- Fetch errors are reported through `onFetchHoverDetailError` only for the item
  that is still current.
- Hover detail hides on actual combobox close.
- Hover detail remains visible when a controlled combobox receives a close
  request but stays open.
- Geometry constants, min/max widths, viewport padding, and transition objects
  are part of the visual contract.

### Render Customization

- `renderOption` customizes option content without requiring callers to render
  primitive item DOM.
- `renderOptionMeta` renders trailing metadata in the current option row shape.
- `popupClassName` replaces the default popup surface class. Existing callers
  must continue to receive exactly the class behavior they requested.
- The function form of primitive `render` is the safest path because it receives
  the final internal props and state.

## Accessibility Target

Accessibility behavior is product behavior. ARIA changes must be treated as
contract changes even when pixels do not move.

Target state:

- Every trigger has a stable accessible name.
- Every popup search input has its own search-specific accessible name.
- Every listbox is associated with the effective field label when a label exists.
- Every option keeps `role="option"`, `aria-selected`, and disabled state.
- Active descendant ids remain stable for the lifetime of an open popup.
- Trigger and input `aria-activedescendant` point only at rendered options.
- `aria-controls` points at the listbox only while the popup is open.
- `aria-invalid` and `aria-describedby` match the current validation state.
- Disabled and read-only state are represented consistently for assistive
  technology without changing visual styling.

Known accessibility hardening items:

- Connect preset listboxes to the effective label without changing trigger names.
- Decide whether `readOnly` should expose `aria-readonly` on the trigger/input.
- Decide whether `required` should expose `aria-required` on the trigger/input
  while keeping native hidden input constraint validation disabled.
- Preserve or explicitly test the current two-combobox-role structure when the
  searchable popup is open: trigger role plus popup search input role.

## Zero-Delta Invariant Catalog

Use this catalog when reviewing every future patch.

### Styling Constants

Do not change these unless the work is explicitly moved out of zero-UX-delta:

- `highlightBackgroundTransition`.
- `selectedOptionScrollTopInset`.
- `pointerHoverResumeThreshold`.
- `keyboardScrollHighlightMaxHold`.
- `hoverDetailHideDelay`.
- `hoverDetailSwitchDelay`.
- `hoverDetailViewportPadding`.
- `hoverDetailHiddenOffset`.
- `hoverDetailMinWidth`.
- `hoverDetailSurfaceHorizontalPadding`.
- `hoverDetailLineWidthBuffer`.
- `hoverDetailAppearTransition`.
- `hoverDetailExitTransition`.
- `hoverDetailRepositionTransition`.
- `popupViewportPadding`.
- `popupMinimumAvailableHeight`.
- Any Tailwind class in the preset trigger, search input, popup, list, option
  row, highlight background, pinned highlight, create button, or hover detail
  surface.

### Event Reasons

Do not rename or repurpose current reasons:

- `escape-key`
- `input-change`
- `item-press`
- `keyboard`
- `none`
- `pointer`
- `trigger-press`

If a new reason is ever added, it must not change existing reason emission for
current flows.

### Data Attributes

These data attributes are part of tests, animation targeting, or maintenance
contracts:

- `data-combobox-popup`
- `data-disabled`
- `data-highlighted`
- `data-selected`
- `data-placeholder`
- `data-pharma-combobox-index`
- `data-pharma-combobox-highlight`
- `data-pharma-combobox-pinned-highlight`
- `data-pharma-combobox-navigation-focus`
- `data-pharma-combobox-option-frame`
- Hover-detail measurement attributes under
  `combobox-hover-detail-popover.tsx`.

Do not remove or rename them unless all dependent tests and call-sites are
reviewed and the change is explicitly accepted as non-zero-delta.

## Risk Register

Track these risks until the component reaches the perfect target:

| Risk                                                             | Severity | Why It Matters                                                                    | Target Mitigation                                                                                       |
| ---------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Controlled `value={null}` can fall through to uncontrolled value | High     | Clearing a controlled select can resurrect stale selection                        | Use `prop !== undefined` controlled checks and add regression tests                                     |
| Preset listbox can miss label association                        | High     | Screen reader listbox context can be incomplete                                   | Connect listbox to effective label without changing visible output                                      |
| Visual highlight sync uses synthetic pointer/mouse events        | Medium   | Semantic state depends on DOM event simulation                                    | Add explicit primitive highlight alignment API                                                          |
| Render-element path overwrites caller handlers/refs              | Medium   | Custom primitive users can lose their own handlers                                | Prefer function render path or compose handlers/refs                                                    |
| Primitive registry is index-based                                | Medium   | Stale or mismatched indices can corrupt disabled skipping/highlight               | Keep rendered indices and `filteredItems` in strict parity; consider generation tracking if bugs appear |
| `itemToStringValue` uniqueness is assumed                        | Medium   | Duplicate values can break React keys, hidden value identity, and selection       | Document uniqueness requirement; add focused tests if duplicate handling becomes required               |
| Accessibility role structure is subtle                           | Medium   | Trigger and search input both expose combobox roles when searchable popup is open | Preserve current behavior unless an a11y-specific change is explicitly scoped                           |
| `allowPropagation()` is unused                                   | Low      | Public API may imply behavior that does not exist                                 | Document as reserved or remove only after API review                                                    |
| `popupClassName` replaces defaults                               | Low      | Callers can accidentally drop surface styles                                      | Keep current replacement semantics; document caller responsibility                                      |
| Tests are concentrated in one large file                         | Low      | Maintenance can become harder as coverage grows                                   | Split only when it improves clarity without weakening assertions                                        |

## Non-Goals

- Do not redesign the combobox.
- Do not replace the local primitive with another library in this track.
- Do not adopt a new visual system, icon set, radius scale, or animation style.
- Do not add multi-select, async search, virtualization, grouped options, custom
  filter ranking, or typeahead beyond the current behavior.
- Do not change outside-dismiss behavior in this zero-UX-delta track. If the
  product later wants click-outside close behavior, that should be treated as a
  separate UX change with its own tests and acceptance criteria.
- Do not move app-specific behavior into `Combobox.Root`.
- Do not add generic abstractions unless they remove current complexity in the
  combobox itself.
- Do not make raw design-system cleanup such as icon replacement, color-token
  conversion, radius changes, or Tailwind class normalization inside this track.
- Do not introduce runtime validation for internal invariants that call-sites
  already satisfy, unless a real bug shows the invariant is crossing a system
  boundary.
- Do not change test selectors merely to make tests look cleaner.

## Architecture Target

### Primitive

`Combobox.Root` should remain the semantic engine. It should expose just enough
state and actions for the preset to render the current experience without
relying on DOM-event simulation.

Target primitive responsibilities:

- Controlled/uncontrolled `value`, `open`, and `inputValue`.
- Filtering through either internal filter logic or caller-provided
  `filteredItems`.
- Item registry with disabled-state awareness.
- Selected value comparison through `isItemEqualToValue`.
- Highlight state and highlight movement APIs.
- Explicit highlight alignment from a known item/index, if needed by the preset.
- Keyboard handling for trigger and input.
- Hidden form input serialization.
- ARIA ids and relationships for trigger, input, listbox, and options.
- Cancelable event details for state transitions.
- Floating UI positioning through `Combobox.Positioner`.

Primitive must stay free of:

- PharmaSys copy.
- Validation overlay logic.
- Hover detail logic.
- Create action logic.
- Visual animation policy.
- App-specific item metadata.

### Preset

`PharmaComboboxSelect` should remain the production adapter for forms.

Target preset responsibilities:

- Current PharmaSys trigger and popup composition.
- Current search input and create action composition.
- Current exact-match create-action rule.
- Current filtered item list generation.
- Current validation overlay integration.
- Current hover detail integration.
- Current animated highlight, keyboard scroll pinning, stationary-pointer
  suppression, and selected/default visual anchor rules.
- Current accessible naming fallback when not wrapped in `FormField`.
- Current manual rendering of options, as long as rendered items and primitive
  `filteredItems` remain perfectly aligned.

Preset must not own:

- Hidden input serialization.
- Primitive item selection semantics.
- Primitive keyboard selection semantics.
- Primitive ARIA role assignment.

### Entity Adapter

`PharmaEntityComboboxSelect` should remain a thin id bridge.

Target entity responsibilities:

- Resolve `valueId` against `items`.
- Fall back to `selectedItem` when the selected id outlives the option list.
- Emit scalar id and selected item through `onValueIdChange`.
- Keep default id/name stringifiers overridable.

It should not grow validation, styling, or filtering behavior.

## State Machine Targets

These are not new features; they are the target mental model for the existing
behavior.

### Open State Machine

- Closed to open by trigger press: reason `trigger-press`.
- Closed to open by ArrowDown, ArrowUp, Enter, or Space on trigger: reason
  `keyboard`.
- Open to closed by Escape: reason `escape-key`.
- Open to closed by accepted item selection: reason `item-press`.
- Open stays open when `onOpenChange` cancels or a controlled caller keeps
  `open=true`.
- Preset cleanup is keyed to actual `open` state, not requested open state.

### Search State Machine

- Search input value is preset state passed to primitive `inputValue`.
- Typing in the search input emits primitive input-change behavior.
- Typing printable characters on an open searchable trigger routes characters
  into the search input and focuses it.
- Clearing search restores the default visual anchor.
- Closing the popup clears search only after the close actually commits.
- Accepted selection clears search after `onValueChange` does not cancel.

### Highlight State Machine

- Opening a searchable preset lets primitive auto-highlight an enabled item.
- Opening a non-searchable preset may show a visual background without primitive
  active index.
- Pointer enter/move sets primitive highlight unless keyboard hover suppression
  is active.
- Arrow navigation sets primitive highlight and schedules keyboard scroll work.
- Visual background follows primitive highlight except when preset rules pin it
  to selected/default visual anchor.
- Pinned highlight temporarily replaces the normal moving highlight during
  keyboard scroll.

### Validation State Machine

- Initial untouched required field is not visually invalid.
- Blur outside the root and portaled popup marks the field as blurred.
- Focus transfer inside root/popup does not mark blurred.
- Required invalid state is `validation.enabled && required && blurred &&
selectedValue == null`.
- Accepted non-empty selection clears visible invalid state by making
  `selectedValue` non-null.

### Hover Detail State Machine

- Hover detail does nothing when disabled.
- First hover waits the configured delay.
- Switching between items while the portal is visible uses the shorter switch
  delay.
- Leaving the list schedules hide and delayed data clearing.
- Closing the combobox hides the portal only after actual close.
- Fetch resolution is ignored unless it still matches the current item id.

## Hardening Backlog

### 1. Controlled State Correctness

Problem:

`Combobox.Root` currently derives selected value with nullish coalescing. A
controlled `value={null}` can be confused with "uncontrolled" when an
uncontrolled fallback exists.

Target:

- Treat `undefined` as the only uncontrolled sentinel for `value`, `open`, and
  `inputValue`.
- Keep `null` as a valid controlled empty value.
- Add tests proving a controlled value can be cleared to `null` without
  resurrecting `defaultValue`.

UX rule:

- No visual or interaction change in normal call-sites.

### 2. Filtered Item And Registry Parity

Problem:

The preset manually maps `visibleItems` while also passing the same array to the
primitive as `filteredItems`. Any mismatch between those two representations can
break highlight, disabled-item skipping, `aria-activedescendant`, and keyboard
selection.

Target:

- Keep a single source of truth for the visible item list within the preset.
- Ensure rendered item index, primitive item index, React key, and
  `data-pharma-combobox-index` stay in lockstep.
- Add regression coverage before changing how options are rendered.

UX rule:

- No option ordering, filtering, highlight, or disabled-skip behavior changes.

### 3. ARIA Completeness

Problem:

The preset supplies its own fallback accessible label, but the primitive listbox
label is only connected to `Combobox.Label`. Because the preset does not render
`Combobox.Label`, listbox labeling can be incomplete.

Target:

- Preserve the current trigger accessible name exactly.
- Connect the popup listbox to the same effective field label when the preset is
  used.
- Ensure current `aria-label`, `aria-labelledby`, and FormField inheritance
  behavior remain compatible.
- Consider exposing a primitive-safe label id path instead of duplicating label
  state in the preset.
- Add tests for preset listbox labeling in standalone, explicit
  `aria-labelledby`, explicit `aria-label`, and FormField cases.

UX rule:

- No copy, visual, focus, or keyboard changes.

### 4. Explicit Highlight Synchronization

Problem:

The preset currently synchronizes visual highlight state back into the primitive
by dispatching synthetic pointer and mouse events. This preserves behavior but
makes the boundary hard to reason about.

Target:

- Add an explicit primitive action for setting or aligning the highlighted index
  when the preset has an existing visual anchor.
- Keep the current `onItemHighlighted` event details and cancellation behavior.
- Preserve the current visual highlight ownership rule: primitive owns
  `activeIndex`, preset owns the final animated background.
- Replace synthetic pointer dispatch only after tests prove event order and
  highlight behavior are identical.
- Ensure the new API can preserve the current cancellation semantics or document
  why alignment is intentionally non-cancelable.

UX rule:

- ArrowDown, ArrowUp, Enter, hover, stationary-pointer suppression, selected
  highlight restore, and wrap scroll must behave exactly as they do now.

### 5. Render Prop Safety

Problem:

The element-form `render={element}` path merges internal props by cloning the
element and only combines `className`. Caller handlers or refs on the rendered
element can be overwritten.

Target:

- Prefer documenting the function render prop as the stable customization path.
- If element render is kept, compose handlers and refs without changing
  invocation order for current behavior.
- Add tests only for behavior that is part of the public contract.

UX rule:

- No DOM output changes for existing function-render preset usage.

### 6. Event Details Contract

Problem:

`allowPropagation()` and `isPropagationAllowed` exist on event details, but no
current combobox path consumes them.

Target:

- Either document them as reserved compatibility fields or remove them only if
  no public contract depends on them.
- Prefer documentation over removal unless there is a clear maintenance cost.

UX rule:

- No event propagation changes in this track.

### 7. Browser Layout Guardrails

Problem:

Popup and hover-detail behavior depends on browser layout primitives that jsdom
cannot model accurately.

Target:

- Keep Playwright coverage for popup flip, viewport clamping, mobile overflow,
  shadow clipping, and keyboard-select browser flow.
- Add browser coverage before changing Floating UI middleware, popup CSS
  overflow, hover detail geometry, or scroll-pinning behavior.
- Keep jsdom tests for pure state transitions and helper geometry math.

UX rule:

- No popup geometry or hover detail geometry changes in this track.

### 8. Test Organization

Problem:

`index.test.tsx` is broad and valuable, but it mixes primitive, preset,
animation-contract, geometry-helper, and app-call-site coverage in one large
file.

Target:

- Keep all current meaningful assertions.
- Split only if the file becomes an active maintenance burden.
- Maintain behavior-oriented tests over markup-only tests.
- Keep Playwright for layout behavior that jsdom cannot prove.

UX rule:

- Do not weaken tests to make refactors pass.

## Test Matrix For Perfecting Work

Use this matrix to decide what each PR must prove.

| Change Area                | Minimum Unit Coverage                                                                         | Browser Coverage                                         |
| -------------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Controlled state sentinels | Controlled clear to `null`; canceled updates; default fallback unchanged                      | Not required                                             |
| ARIA label wiring          | Trigger, search input, listbox ids for standalone, FormField, `aria-label`, `aria-labelledby` | Optional screen-reader manual spot check if roles change |
| Filter/render parity       | Search result order; no stale options; disabled skip after filtering                          | Existing keyboard search/select test                     |
| Highlight alignment API    | Pointer, ArrowDown, ArrowUp, Enter, selected restore, disabled skip, canceled highlight       | Existing keyboard navigation continuation tests          |
| Popup positioning          | Existing style variables only                                                                 | Required if middleware/style constants change            |
| Hover detail               | Base data, async success, async error, stale fetch, controlled open close request             | Required if geometry/transition changes                  |
| Validation                 | Blur inside/outside portal, required sentinel, selectedItem outside list                      | Not required                                             |
| Render customization       | Function render prop state, handler/ref composition if changed                                | Not required                                             |

## Manual Review Checklist

Before merging any combobox hardening PR, review these manually:

- Does the diff touch any Tailwind class, transition object, timing constant, or
  geometry constant?
- Does the diff change event order for trigger click, trigger keydown, search
  input keydown, option hover, option click, blur, or create action?
- Does the diff change when `details.cancel()` is checked?
- Does the diff change when search is cleared?
- Does the diff change when hover detail hides or clears data?
- Does the diff change which element receives focus?
- Does the diff change the hidden input `name`, `form`, `value`, or `disabled`
  behavior?
- Does the diff change accessible names or roles? If yes, is that intentionally
  covered as accessibility behavior?
- Does the diff assume an item value string is unique? If yes, is that already
  true for all call-sites?
- Does the diff preserve React Fast Refresh constraints by keeping shared
  helpers outside component modules unless the existing namespace exception is
  being used?

## Acceptance Checklist

A perfecting PR is acceptable only when all items below are true:

- No product-facing copy changed.
- No Tailwind class that affects visual output changed unless the before/after
  computed output is proven identical.
- No `motion` transition object changed.
- No timing constants changed.
- No popup positioning constants changed.
- No hover detail geometry constants changed.
- No keyboard-pinned-highlight constants changed.
- No option ordering, filtering, or exact-match create rule changed.
- No hidden input name/value behavior changed, except fixing controlled `null`
  correctness where current behavior contradicts the documented API.
- No accessible names or roles changed unless the PR is explicitly an
  accessibility hardening PR with before/after coverage.
- No event reason changed for existing flows.
- No event callback order changed for existing flows.
- No call-site needs prop changes.
- No new dependency is added.
- No dev server is started by the agent workflow.
- Existing combobox unit tests pass.
- New tests cover any fixed internal contract.
- Playwright combobox tests pass when a VitePlus dev server is provided by the
  user.

## Suggested Implementation Order

1. Add controlled-null regression coverage.
2. Fix controlled sentinel handling with `prop !== undefined` checks.
3. Add filtered item/index parity assertions around a representative preset flow.
4. Add preset listbox ARIA coverage.
5. Add the smallest primitive/preset label-id connection needed for complete
   ARIA without changing visible output.
6. Add tests that lock current visual-highlight event behavior.
7. Introduce an explicit highlight alignment API.
8. Replace synthetic pointer dispatch with the explicit API only after parity is
   proven.
9. Revisit render-element prop safety if there is an actual call-site or
   public-contract need.

## Validation Plan

For documentation-only edits, skip validation.

For targeted code changes in this track, run the affected combobox tests:

```bash
AI_AGENT=codex vp test run --passWithNoTests src/components/combobox/index.test.tsx
```

For TypeScript/React logic changes, run the repo check on touched files:

```bash
vp check --fix src/components/combobox/primitive.tsx src/components/combobox/presets.tsx src/components/combobox/index.test.tsx
```

For browser-layout parity, ask the user to start the VitePlus dev server, then
run:

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:5173 bun run test:e2e -- tests/playwright/combobox.spec.ts
```

Do not start the dev server from the agent workflow.
