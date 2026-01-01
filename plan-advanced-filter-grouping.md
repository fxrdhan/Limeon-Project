# Advanced Filter Grouping Plan

Goal: support nested grouping and mixed AND/OR joins in the search pattern, matching
AG Grid Advanced Filter builder behavior.

## Proposed Pattern Grammar (ASCII)

- Tokens: `#field`, `#operator`, `value`, `#to`, `#and`/`#or`, `#(`, `#)`, `##`
- Group: `#( ... #)` contains 1+ conditions or subgroups joined by AND/OR.
- Confirm: `##` at end of the full pattern.
- Example (matches the screenshot case):
  `#( #name #contains para #and #( #sell_price #greaterThanOrEqual 500 #and #sell_price #lessThanOrEqual 600 #) #and #name #contains mol #and #( #base_price #greaterThanOrEqual 700 #or #base_price #lessThanOrEqual 800 #) #)##`

## Execution Plan

1. Define AST types for grouped filters and update shared search types with backward compatibility.
   - Targets: `src/types/search.ts`, `src/components/search-bar/types/search.ts`.
2. Build tokenizer + parser for grouped patterns and wire into `parseSearchValue`.
   - Targets: `src/components/search-bar/utils/searchUtils.ts`,
     `src/components/search-bar/utils/parser/*`.
3. Extend `PatternBuilder` + `patternRestoration` to serialize AST back to pattern strings.
   - Targets: `src/components/search-bar/utils/PatternBuilder.ts`,
     `src/components/search-bar/utils/patternRestoration.ts`.
4. Update badge creation/editing to read from AST and keep existing flat-pattern UX intact.
   - Targets: `src/components/search-bar/hooks/useBadgeBuilder.ts`,
     `src/components/search-bar/hooks/useBadgeHandlers.ts`,
     `src/components/search-bar/components/SearchBadge.tsx`.
5. Update Advanced Filter model builder to produce nested `AdvancedFilterModel`
   (mixed AND/OR + groups) from the AST.
   - Target: `src/utils/advancedFilterBuilder.ts`.
6. Align validation + confirmation flow with grouped patterns.
   - Targets: `src/components/search-bar/utils/validationUtils.ts`,
     `src/components/search-bar/hooks/useSearchState.ts`.
7. Add or update focused tests for parsing/serialization (if existing test patterns apply),
   and define manual verification patterns (flat + grouped).

## Checkpoints (per step)

- Parser can round-trip: pattern -> AST -> pattern (no loss).
- Mixed AND/OR is preserved in `AdvancedFilterModel`.
- Flat patterns continue to work without grouping tokens.
