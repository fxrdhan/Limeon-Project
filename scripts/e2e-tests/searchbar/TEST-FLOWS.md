# SearchBar Filter E2E Test Flows

**Application URL**: `http://localhost:5173/master-data/item-master/items`

**Test Method**: Execute interactively using Claude Code + Playwright MCP

---

## Badge Creation Tests

### Case 0: Column Badge Only

**Goal**: Validate column selection creates 1 badge

**Steps**:

1. Navigate to Item Master page
2. Click search textbox "Cari item..."
3. Type "#"
4. Click "Harga Pokok"

**Expected Result**:

- 1 badge: `[Harga Pokok]`
- Operator selector auto-opens

---

### Case 1: Column + Operator Badges

**Goal**: Validate operator selection creates 2 badges

**Steps**:

1. Navigate to Item Master page
2. Click search textbox "Cari item..."
3. Type "#"
4. Click "Harga Pokok"
5. Click "Greater Than" from operator selector

**Expected Result**:

- 2 badges: `[Harga Pokok][Greater Than]`
- Ready for value input

---

### Case 2: Simple Filter (Complete)

**Goal**: Validate complete simple filter with data filtering

**Steps**:

1. Navigate to Item Master page
2. Click search textbox "Cari item..."
3. Type "#"
4. Click "Harga Pokok"
5. Click "Greater Than"
6. Type "50000"
7. Press Enter

**Expected Result**:

- 3 badges: `[Harga Pokok][Greater Than][50000]`
- Filter panel shows: "Harga Pokok > 50000"
- Data grid shows only items where Harga Pokok > 50,000

---

### Case 3: Multi-Condition Partial (Incomplete)

**Goal**: Validate multi-condition setup without second value

**Steps**:

1. Create simple filter (Case 2)
2. In search textbox, type "#"
3. Click "AND"
4. Click "Less Than"

**Expected Result**:

- 5 badges: `[Harga Pokok][Greater Than][50000][AND][Less Than]`
- Filter panel shows: "> 50000" (second condition not applied)
- Ready for second value input

---

### Case 4: Multi-Condition Complete

**Goal**: Validate complete range filter

**Steps**:

1. Create multi-condition partial (Case 3)
2. Type "100000"
3. Press Enter

**Expected Result**:

- 6 badges: `[Harga Pokok][Greater Than][50000][AND][Less Than][100000]`
- Filter panel shows: "> 50000 AND < 100000"
- Data grid shows only items where 50,000 < Harga Pokok < 100,000

---

## Badge Deletion Tests

### D1: Delete Value Badge

**Setup**: Case 2 (3 badges)
**Initial**: `[Harga Pokok][Greater Than][50000]`

**Steps**:

1. Create simple filter (Case 2)
2. Hover over "50000" badge
3. Click delete (X) button

**Expected Result**:

- 2 badges: `[Harga Pokok][Greater Than]`
- Filter panel shows: "Harga Pokok is (All)"
- All items displayed (filter cleared)

**Validates**:

- Value removal keeps column + operator
- Filter auto-clears without value
- Input ready for new value

---

### D2: Delete Operator Badge

**Setup**: Case 2 (3 badges)
**Initial**: `[Harga Pokok][Greater Than][50000]`

**Steps**:

1. Create simple filter (Case 2)
2. Hover over "Greater Than" badge
3. Click delete (X) button

**Expected Result**:

- 1 badge: `[Harga Pokok]`
- Filter panel shows: "Harga Pokok is (All)"
- Operator selector auto-opens
- All items displayed

**Validates**:

- Operator deletion removes both operator AND value (cascading)
- Column badge remains
- Operator selector reopens for new selection

---

### D3: Delete Second Value

**Setup**: Case 4 (6 badges)
**Initial**: `[Harga Pokok][Greater Than][50000][AND][Less Than][100000]`

**Steps**:

1. Create complete multi-condition (Case 4)
2. Hover over "100000" badge
3. Click delete (X) button

**Expected Result**:

- 5 badges: `[Harga Pokok][Greater Than][50000][AND][Less Than]`
- Filter panel shows: "> 50000" (only first condition)
- Data filtered by first condition only
- Ready for second value input

**Validates**:

- Second value removal keeps all other badges
- Filter reverts to first condition only
- Second condition incomplete, not applied

---

### D4: Delete Second Operator

**Setup**: Case 4 (6 badges)
**Initial**: `[Harga Pokok][Greater Than][50000][AND][Less Than][100000]`

**Steps**:

1. Create complete multi-condition (Case 4)
2. Hover over "Less Than" badge (second operator)
3. It will be: [Less Than (edit icon)(close icon)]
4. Click 'x' button

**Expected Result**:

- 4 badges: `[Harga Pokok][Greater Than][50000][AND]`
- Filter panel shows: "> 50000" (only first condition)
- Operator selector auto-opens for second condition
- Data filtered by first condition only

**Validates**:

- Second operator deletion removes second value too (cascading)
- Join operator remains
- Operator selector reopens for new second condition

---

### D5: Delete Join Operator

**Setup**: Case 4 (6 badges)
**Initial**: `[Harga Pokok][Greater Than][50000][AND][Less Than][100000]`

**Steps**:

1. Create complete multi-condition (Case 4)
2. Hover over "AND" badge
3. It will be: [AND (edit icon)(close icon)]
4. Click 'x' button

**Expected Result**:

- 3 badges: `[Harga Pokok][Greater Than][50000]`
- Filter panel shows: "> 50000"
- Data filtered by first condition only

**Validates**:

- Join operator deletion removes entire second condition
- Cascading: AND + second operator + second value all removed
- Reverts to simple filter state

---

## Badge Edit Tests

### E0: Edit Column Badge (2 Badges - Column + Operator)

**Setup**: Case 1 (2 badges)
**Initial**: `[Harga Pokok][Greater Than]`

**Steps**:

1. Create Case 1 (2 badges - column + operator)
2. Hover over "Harga Pokok" badge
3. Badge UI: [Harga Pokok (edit icon)(close icon)]
4. Click edit button (pena icon, first button)

**Expected Result**:

- Column selector opens with all columns
- Both badges remain visible: `[Harga Pokok][Greater Than]`
- Ready to select new column

**Continue Editing**:

5. Select "Harga Jual" from column selector

**Final Expected Result**:

- Badge updated: `[Harga Jual][Greater Than]`
- Operator badge preserved (not reset)
- No operator selector popup (operator preserved correctly)
- Ready for value input

**Validates**:

- Column badge has edit functionality
- Edit preserves operator badge when no value exists yet
- Operator compatibility check works correctly
- No unnecessary operator selector popup after column change
- Smooth transition from one column to another

---

### E1: Edit Column Badge (3 Badges - Simple Filter with Sync Test)

**Setup**: Case 2 (3 badges)
**Initial**: `[Harga Pokok][Greater Than][50000]`

**Steps**:

1. Create simple filter (Case 2)
2. Verify filter panel shows: "Harga Pokok > 50000"
3. Hover over "Harga Pokok" badge
4. Badge UI: [Harga Pokok (edit icon)(close icon)]
5. Click edit button (pena icon, first button)

**Expected Result**:

- Column selector opens with all columns
- All badges remain visible: `[Harga Pokok][Greater Than][50000]`
- Ready to select new column

**Continue Editing**:

6. Select "Harga Jual" from column selector

**Final Expected Result**:

- Badges updated: `[Harga Jual][Greater Than][50000]`
- Operator and value badges preserved
- Filter panel synchronized: "Harga Jual > 50000"
- Data grid re-filters to show items where Harga Jual > 50,000
- Filter confirmation maintained (##)

**Validates**:

- Column badge edit in complete filter preserves operator and value
- Filter panel synchronization after column change
- AG Grid filter model updates correctly with new column
- Data grid re-filters with new column field
- Confirmed filter state maintained after edit

---

### E2: Edit Value Badge (Simple Filter)

**Setup**: Case 2 (3 badges)
**Initial**: `[Harga Pokok][Greater Than][50000]`

**Steps**:

1. Create simple filter (Case 2)
2. Hover over "50000" badge
3. Badge UI: [50000 (edit icon)(close icon)]
4. Click edit button (pena icon, first button)

**Expected Result**:

- All badges preserved: `[Harga Pokok][Greater Than][50000]` visible with edit/close icons
- Input focused with value: "50000"
- Cursor positioned at end of value
- Ready for editing

**Continue Editing**:

5. Modify value to "60000"
6. Press Enter

**Final Expected Result**:

- Badge updated: `[Harga Pokok][Greater Than][60000]`
- Filter panel shows: "> 60000"
- Data grid shows items where Harga Pokok > 60,000
- Edit mode exits, badges return to normal state

**Validates**:

- Value badge has edit functionality
- Edit preserves all other badges (column, operator)
- Input pre-filled with current value for easy editing
- Filter updates correctly after edit
- Data grid re-filters with new value

---

### E3: Edit Second Value Badge (Multi-Condition Filter)

**Setup**: Case 4 (6 badges)
**Initial**: `[Harga Pokok][Greater Than][50000][AND][Less Than][100000]`

**Steps**:

1. Create complete multi-condition (Case 4)
2. Hover over "100000" badge (second value)
3. Badge UI: [100000 (edit icon)(close icon)]
4. Click edit button (pena icon, first button)

**Expected Result**:

- All badges preserved: `[Harga Pokok][Greater Than][50000][AND][Less Than][100000]` visible with edit/close icons
- Input focused with value: "100000"
- Cursor positioned at end of value
- Ready for editing

**Continue Editing**:

5. Modify value to "80000"
6. Press Enter

**Final Expected Result**:

- Badge updated: `[Harga Pokok][Greater Than][50000][AND][Less Than][80000]`
- Filter panel shows: "> 50000 AND < 80000"
- Data grid shows items where 50,000 < Harga Pokok < 80,000
- Edit mode exits, badges return to normal state

**Validates**:

- Second value badge has edit functionality in multi-condition filters
- Edit preserves all other badges (column, operators, join, first value)
- Input pre-filled with current value for easy editing
- Filter updates correctly after edit
- Data grid re-filters with new range
- Preserved state properly cleared after multi-condition edit

---

### E4: Edit First Value Badge (Multi-Condition Filter)

**Setup**: Case 4 (6 badges)
**Initial**: `[Harga Pokok][Greater Than][50000][AND][Less Than][100000]`

**Steps**:

1. Create complete multi-condition (Case 4)
2. Hover over "50000" badge (first value)
3. Badge UI: [50000 (edit icon)(close icon)]
4. Click edit button (pena icon, first button)

**Expected Result**:

- All badges preserved: `[Harga Pokok][Greater Than][50000][AND][Less Than][100000]` visible with edit/close icons
- Input focused with value: "50000"
- Cursor positioned at end of value
- Ready for editing

**Continue Editing**:

5. Modify value to "60000"
6. Press Enter

**Final Expected Result**:

- Badge updated: `[Harga Pokok][Greater Than][60000][AND][Less Than][100000]`
- Filter panel shows: "> 60000 AND < 100000"
- Data grid shows items where 60,000 < Harga Pokok < 100,000
- Edit mode exits, badges return to normal state

**Validates**:

- First value badge has edit functionality in multi-condition filters
- Edit preserves all other badges (column, operator, join, second operator, second value)
- Input pre-filled with current value for easy editing
- Filter updates correctly after edit
- Data grid re-filters with new range
- Multi-condition filter remains intact after first value edit

---

### E5: Edit Join Operator Badge (5 Badges - Partial Multi-Condition)

**Setup**: Case 3 variant (5 badges - partial multi-condition with second operator selected)
**Initial**: `[Harga Pokok][Greater Than][50000][AND][Less Than]`

**Steps - Part 1: AND → OR**:

1. Create partial multi-condition (Case 3):
   - Type "#", select "Harga Pokok"
   - Select "Greater Than" operator
   - Type "50000", press Enter
   - Type "#", select "AND"
   - Select "Less Than" operator (stop here, don't type second value)
2. Hover over "AND" badge (join operator)
3. Click edit button (pena icon)
4. **PAUSE - Join operator selector modal appears**
5. **Take snapshot - Verify "AND" option is highlighted** (currently selected)
6. Select "OR" from join operator selector

**Expected Result Part 1**:

- Badges updated: `[Harga Pokok][Greater Than][50000][OR][Less Than]`
- All other badges preserved

**Steps - Part 2: OR → AND**:

7. Hover over "OR" badge (join operator)
8. Click edit button (pena icon)
9. **PAUSE - Join operator selector modal appears**
10. **Take snapshot - Verify "OR" option is highlighted** (currently selected)
11. Select "AND" from join operator selector

**Final Expected Result**:

- Badges updated: `[Harga Pokok][Greater Than][50000][AND][Less Than]`
- All other badges preserved
- Filter panel shows: "> 50000" (only first condition, second value missing)
- Data grid shows items where Harga Pokok > 50,000

**Validates**:

- Join operator badge has edit functionality
- **Modal correctly highlights currently selected option** (critical validation)
- Edit preserves all other badges (column, operators, value)
- Join operator can be changed bidirectionally (AND↔OR)
- System handles partial multi-condition state properly

**Key Focus**: This test specifically validates that when editing join operator badge, the selector modal correctly shows which option is currently active by highlighting it.

---

## Synchronization Validation

### Sync Test: Badge ↔ Filter Panel

**Goal**: Validate UI badges match AG Grid Filter Panel state

**Test Scenarios**:

#### Scenario A: Simple Filter Sync

1. Create Case 2 (3 badges)
2. Open Filter Panel (right side)
3. Verify panel shows: "Harga Pokok > 50000"

#### Scenario B: Multi-Condition Sync

1. Create Case 4 (6 badges)
2. Open Filter Panel
3. Verify panel shows: "Harga Pokok > 50000 AND < 100000"

**Validates**:

- Badge representation matches filter state
- AG Grid receives correct filter configuration
- Filter logic consistency between UI and data layer

---

## Test Execution Guide

### Using Claude Code + Playwright MCP:

1. **Start Playwright**:
   - Open Claude Code
   - Use Playwright MCP tools to navigate and interact

2. **Execute Test**:

   ```
   Example: "Run test D1"
   or: "Test deletion case D1"
   ```

3. **Claude Will**:
   - Navigate to the page
   - Execute the steps
   - Take screenshots
   - Validate results
   - Report pass/fail

4. **Screenshots saved to**: `.playwright-mcp/`

### Benefits of This Approach:

✅ No code maintenance
✅ Easy to read and understand
✅ Flexible execution
✅ Interactive validation
✅ Auto-screenshot documentation
✅ No helper function dependencies

---

## Coverage Summary

- **Creation Tests**: 5 scenarios (1-6 badges)
- **Deletion Tests**: 5 scenarios (all deletion behaviors)
- **Edit Tests**: 6 scenarios (E0: column badge 2-badges, E1: column badge 3-badges with sync, E2: value badge simple, E3: 2nd value multi-condition, E4: 1st value multi-condition, E5: join operator badge 5-badges)
- **Sync Tests**: 2 scenarios (UI ↔ data validation)
- **Total**: 18 test scenarios

### Key Behaviors Tested:

- Badge creation and rendering
- User interactions (click, type, keyboard)
- State management and transitions
- Data synchronization
- Cascading deletions
- Badge editing (column badge, value badges, join operator badge)
- Operator preservation during column edit
- Join operator editing with partial multi-condition
- Auto-opening selectors
- Filter panel updates
- Data grid filtering
- Partial multi-condition state handling
