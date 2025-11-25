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

## Between Operator Tests

### B0: Between Operator with Space-Separated Values

**Goal**: Validate Between operator creates 5 badges with space-separated input

**Steps**:

1. Navigate to Item Master page
2. Click search textbox "Cari item..."
3. Type "#"
4. Click "Harga Pokok"
5. Click "Between" from operator selector
6. Type "50000 60000" (with space)
7. Press Enter

**Expected Result**:

- 5 badges: `[Harga Pokok][Between][50000][to][60000]`
- Badge "to" automatically added as separator between min and max values
- Filter panel shows: "Harga Pokok Between 50000 and 60000"
- Two separate spinbuttons in filter panel:
  - "Filter from value": 50000
  - "Filter to Value": 60000
- Console log: `[handleItemFilterSearch] Single condition filter {field: base_price, operator: inRange, value: ...}`
- Data grid shows only items where 50,000 ≤ Harga Pokok ≤ 60,000

**Validates**:

- Between operator correctly parses space-separated values
- Badge "to" separator automatically created
- Operator `inRange` correctly used internally
- Filter panel synchronization with two value inputs
- Data grid filtering within range works correctly
- Single condition filter structure maintained

**Key Technical Details**:

- Input format: `"value1 value2"` (space as delimiter)
- Badge structure: 5 badges with automatic "to" separator
- Internal operator: `inRange` (not `between`)
- Filter type: Single condition (not multi-condition)

---

### B1: Between Operator with Multi-Condition (AND + Less Than)

**Goal**: Validate Between operator can be combined with multi-condition filter

**Steps**:

1. Create Between filter (B0):
   - Navigate to Item Master page
   - Click search textbox "Cari item..."
   - Type "#"
   - Click "Harga Pokok"
   - Click "Between" from operator selector
   - Type "50000 60000" (with space)
   - Press Enter
2. **State**: 5 badges: `[Harga Pokok][Between][50000][to][60000]`
3. Add multi-condition:
   - Type "#" to open join/column selector
   - Click "AND" join operator
   - Click "Less than" operator
   - Type "70000"
   - Press Enter

**Expected Result**:

- 8 badges: `[Harga Pokok][Between][50000][to][60000][AND][Less than][70000]`
- Between operator successfully combined with second condition
- Badge "to" separator remains between Between values
- Filter panel shows both conditions:
  - Between with two spinbuttons: 50000 to 60000
  - AND radio button checked
  - Second operator: "Less than"
  - Second value: 70000
- Console logs:
  - `[LOG] Multi-condition detected!`
  - `[LOG] AG Grid conditions: [Object, Object]`
  - `[LOG] Combined model: {filterType: number, operator: AND, conditions: Array...}`
- Data grid shows items where: `(50,000 ≤ Harga Pokok ≤ 60,000) AND (Harga Pokok < 70,000)`

**Validates**:

- Between operator CAN be combined with multi-condition filters
- System correctly detects as Multi-condition (not Single condition)
- Badge "to" separator preserved in multi-condition context
- Both conditions applied with AND join operator
- Filter panel synchronization for complex multi-condition
- AG Grid applies combined filter model correctly
- Between (inRange) works as first condition in multi-condition filter

**Key Technical Details**:

- Badge structure: 8 badges total (5 from Between + 3 from second condition)
- Filter type: **Multi-condition** (confirmed by console log)
- First condition: `inRange` operator with two values (50000-60000)
- Join operator: AND
- Second condition: `lessThan` operator with single value (70000)
- AG Grid model: Combined conditions with AND operator

**Important Note**:

This validates that Between operator is not limited to single-condition filters. It can be part of complex multi-condition queries, enabling powerful range-based filtering combined with additional constraints.

---

## Badge Deletion Tests

### D0: Delete Operator Badge (2 Badges → 1 Badge)

**Setup**: Case 1 (2 badges - column + operator)
**Initial**: `[Harga Pokok][Greater Than]`

**Goal**: Validate operator badge deletion via Delete key

**Steps**:

1. Create Case 1 (2 badges):
   - Navigate to Item Master page
   - Click search textbox "Cari item..."
   - Type "#"
   - Click "Harga Pokok"
   - Click "Greater Than" from operator selector
2. **State**: 2 badges: `[Harga Pokok][Greater Than]`
3. **Input is empty and focused** (ready for value input)
4. Hit Delete key once

**Expected Result**:

- **1 badge**: `[Harga Pokok]`
- Operator badge removed
- Operator selector auto-opens
- Input remains empty and focused
- Ready to select new operator

**Validates**:

- Delete key removes the operator badge (works even when modal is open)
- Column badge is preserved
- Operator selector automatically reopens for new selection
- System correctly transitions from 2-badge state back to 1-badge state
- Enables quick operator change without manual badge interaction

**Key Focus**: This test validates the Delete key deletion of operator badge when no value has been entered yet, allowing users to quickly change their operator choice.

**Note**: Delete key is used for badge deletion (separate from Backspace which is used for modal internal search).

---

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
2. Hover over "Greater Than" badge: it become:[Greater Than (edit icon)(close icon)]
3. Click close/delete (X) button

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

### D2a: Delete First Operator Badge (Multi-Condition Filter)

**Setup**: Case 4 (6 badges)
**Initial**: `[Harga Pokok][Greater Than or Equal][50000][AND][Less Than][100000]`

**Steps**:

1. Create complete multi-condition (Case 4)
2. Hover over "Greater Than or Equal" badge (first operator)
3. Badge UI: [Greater Than or Equal (edit icon)(close icon)]
4. Click delete (X) button

**Expected Result**:

- 1 badge: `[Harga Pokok]`
- Operator selector auto-opens
- Filter panel shows: "Harga Pokok is (All)"
- All items displayed (filter cleared)
- Ready to select new operator

**Validates**:

- First operator deletion in multi-condition removes entire filter (cascading)
- Removes: first operator + first value + join operator + second operator + second value
- Column badge remains
- Operator selector reopens for fresh start
- System correctly resets from complete multi-condition to column-only state

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

### D6: Progressive Deletion to Empty (6 Badges → 0 Badges)

**Setup**: Case 4 (6 badges - complete multi-condition)
**Initial**: `[Harga Pokok][Greater Than or Equal][50000][AND][Less Than][100000]`

**Goal**: Validate progressive deletion via Delete key from 6 badges down to completely empty state

**Note**: Delete key is used for badge deletion. This works even when modal selectors are open, unlike Backspace which is reserved for modal internal search.

**Steps - Progressive Deletion (One-by-One)**:

1. Create complete multi-condition filter (Case 4):
   - Type "#", select "Harga Pokok"
   - Select "Greater Than or Equal" operator
   - Type "50000", press Enter
   - Type "#", select "AND"
   - Select "Less Than" operator
   - Type "100000", press Enter
2. **State**: 6 badges confirmed: `[Harga Pokok][Greater Than or Equal][50000][AND][Less Than][100000]`
3. **Deletion Step 1 - Enter Edit Mode for Second Value**:
   - Hit Delete key once
   - Input shows: `100000` (second value in edit mode)
   - **Expected**: 6 badges still visible (edit mode active)
4. **Deletion Step 2 - Clear Second Value**:
   - Select all (Ctrl+A) and hit Delete or Backspace
   - **Expected State**: 5 badges: `[Harga Pokok][Greater Than or Equal][50000][AND][Less Than]`
   - **Expected**: Input empty and focused
5. **Deletion Step 3 - Remove Second Operator Badge**:
   - Hit Delete key once
   - **Expected State**: 4 badges: `[Harga Pokok][Greater Than or Equal][50000][AND]`
   - **Expected**: Operator selector auto-opens (fresh state, no highlighting)
   - **Screenshot checkpoint**: Verify 4 badges + operator selector visible
6. **Deletion Step 4 - Remove AND Badge via Delete**:
   - Hit Delete key once (works even with modal open!)
   - **Expected State**: 3 badges: `[Harga Pokok][Greater Than or Equal][50000]`
   - **Expected**: Input empty, no selector open
   - **Screenshot checkpoint**: Verify 3 badges visible
7. **Deletion Step 5 - Enter Edit Mode for First Value**:
   - Hit Delete key once
   - Input shows: `50000` (first value in edit mode)
   - **Expected**: 3 badges still visible (edit mode active)
8. **Deletion Step 6 - Clear First Value**:
   - Select all (Ctrl+A) and hit Delete or Backspace
   - **Expected State**: 2 badges: `[Harga Pokok][Greater Than or Equal]`
   - **Expected**: Input empty and focused
   - **Screenshot checkpoint**: Verify 2 badges visible
9. **Deletion Step 7 - Remove Operator Badge via Delete**:
   - Hit Delete key once
   - **Expected State**: 1 badge: `[Harga Pokok]`
   - **Expected**: Operator selector auto-opens
   - **Screenshot checkpoint**: Verify 1 badge + operator selector visible
10. **Deletion Step 8 - Remove Column Badge via Delete**:
    - Hit Delete key once (works even with modal open!)
    - **Expected State**: 0 badges (completely empty)
    - **Expected**: Input completely empty, no selectors open
    - **Expected**: Search bar in initial state
    - **Screenshot checkpoint**: Verify completely empty state

**Final Expected Result**:

- **Zero badges visible**
- Input is empty
- No selector modals open
- Search bar in pristine initial state (as if never used)
- All items displayed in data grid (no filter applied)
- Filter panel shows "Harga Pokok" and "Harga Jual" in default state

**Validates**:

- Complete deletion flow from 6 badges to 0 badges works correctly
- Each deletion step produces expected badge count
- Operator selectors auto-open at appropriate steps
- Delete key behavior correct at each state transition
- **Delete key works even when modal selectors are open** (critical for smooth UX)
- System correctly handles all state transitions:
  - 6 badges (confirmed multi-condition)
  - 5 badges (partial multi-condition, second value cleared)
  - 4 badges (partial join with operator selector)
  - 3 badges (simple filter confirmed)
  - 2 badges (column + operator)
  - 1 badge (column only with selector)
  - 0 badges (empty state)
- Input focus maintained throughout deletion sequence
- No leftover state or badges after complete deletion
- System properly resets to initial state

**Key Focus**: This comprehensive test validates the entire deletion lifecycle, ensuring users can completely remove a complex filter step-by-step via Delete key, with the system correctly handling each intermediate state. The Delete key works independently of modal state, allowing seamless badge deletion even when selectors are open.

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

### E6: Edit Column Badge (6 Badges - Multi-Condition Filter)

**Setup**: Case 4 (6 badges)
**Initial**: `[Harga Pokok][Greater Than][50000][AND][Less Than][100000]`

**Steps**:

1. Create complete multi-condition (Case 4)
2. Hover over "Harga Pokok" badge (column)
3. Badge UI: [Harga Pokok (edit icon)(close icon)]
4. Click edit button (pena icon, first button)

**Expected Result**:

- Column selector opens with all columns
- All 6 badges remain visible: `[Harga Pokok][Greater Than][50000][AND][Less Than][100000]`
- Ready to select new column

**Continue Editing**:

5. Select "Harga Jual" from column selector

**Final Expected Result**:

- Badges updated: `[Harga Jual][Greater Than][50000][AND][Less Than][100000]`
- All badges preserved with new column field
- Filter panel synchronized: "Harga Jual > 50000 AND < 100000"
- Data grid re-filters to show items where 50,000 < Harga Jual < 100,000
- Multi-condition structure maintained

**Validates**:

- Column badge edit in multi-condition filter preserves entire filter structure
- Both operators and values preserved during column change
- Join operator (AND/OR) maintained
- Operator compatibility check works for both first and second operators
- Filter panel synchronization after column change in multi-condition
- AG Grid filter model updates correctly with new column for both conditions
- Data grid re-filters with new column field for range filter
- Confirmed multi-condition state maintained after edit

---

### E7: Edit First Operator Badge (6 Badges - Multi-Condition Filter)

**Setup**: Case 4 (6 badges)
**Initial**: `[Harga Pokok][Greater Than][50000][AND][Less Than][100000]`

**Steps**:

1. Create complete multi-condition (Case 4)
2. Hover over "Greater Than" badge (first operator)
3. Badge UI: [Greater Than (edit icon)(close icon)]
4. Click edit button (pena icon, first button)

**Expected Result**:

- Operator selector opens with all number operators
- All 6 badges remain visible: `[Harga Pokok][Greater Than][50000][AND][Less Than][100000]`
- Ready to select new operator

**Continue Editing**:

5. Select "Greater Than or Equal" (≥) from operator selector

**Final Expected Result**:

- Badges updated: `[Harga Pokok][Greater Than or Equal][50000][AND][Less Than][100000]`
- First operator changed, all other badges preserved
- Filter panel synchronized: "Harga Pokok ≥ 50000 AND < 100000"
- Data grid re-filters to show items where Harga Pokok ≥ 50,000 AND < 100,000
- Multi-condition structure maintained

**Validates**:

- First operator badge has edit functionality in multi-condition filter
- Edit preserves all other badges (column, first value, join operator, second operator, second value)
- Operator selector shows correct operators for column type
- Filter panel synchronization after first operator change
- AG Grid filter model updates correctly with new operator for first condition
- Data grid re-filters with new operator logic
- Second condition remains intact during first operator edit
- Confirmed multi-condition state maintained after operator edit

---

### E8: Edit Column Badge (5 Badges - Partial Multi-Condition)

**Setup**: Case 3 (5 badges - partial multi-condition)
**Initial**: `[Harga Pokok][Greater Than][50000][AND][Less Than]`

**Steps**:

1. Create partial multi-condition (Case 3):
   - Type "#", select "Harga Pokok"
   - Select "Greater Than" operator
   - Type "50000", press Enter
   - Type "#", select "AND"
   - Select "Less Than" operator (stop here, don't type second value)
2. Hover over "Harga Pokok" badge (column)
3. Badge UI: [Harga Pokok (edit icon)(close icon)]
4. Click edit button (pena icon, first button)

**Expected Result**:

- Column selector opens with all columns
- All 5 badges remain visible: `[Harga Pokok][Greater Than][50000][AND][Less Than]`
- Ready to select new column

**Continue Editing**:

5. Select "Harga Jual" from column selector

**Final Expected Result**:

- Badges updated: `[Harga Jual][Greater Than][50000][AND][Less Than]`
- All badges preserved with new column field
- Filter panel shows: "Harga Jual > 50000" (only first condition, second value missing)
- Data grid re-filters to show items where Harga Jual > 50,000
- Partial multi-condition structure maintained (second operator preserved)

**Validates**:

- Column badge edit in partial multi-condition preserves entire filter structure
- Both first operator and second operator preserved during column change
- First value preserved, second operator maintained even without second value
- Join operator (AND/OR) maintained
- Operator compatibility check works for both operators
- Filter panel synchronization after column change in partial multi-condition
- AG Grid filter applies only first condition (second incomplete)
- Data grid re-filters with new column field
- Partial multi-condition state maintained after column edit

---

### E9: Delete Second Operator via Delete Key (Progressive Deletion from 6 Badges)

**Setup**: Case 4 (6 badges - complete multi-condition)
**Initial**: `[Harga Pokok][Greater Than or Equal][50000][AND][Less Than][100000]`

**Note**: Delete key is used for badge deletion (works even when modal is open).

**Steps - Progressive Deletion**:

1. Create complete multi-condition filter (Case 4):
   - Type "#", select "Harga Pokok"
   - Select "Greater Than or Equal" operator
   - Type "50000", press Enter
   - Type "#", select "AND"
   - Select "Less Than" operator
   - Type "100000", press Enter
2. **State**: Confirmed multi-condition with 6 badges
3. **First Delete**: Enter edit mode for second value
   - Hit Delete key once
   - Input shows: `100000` (second value in edit mode)
4. **Clear the value**: Clear the value completely
   - Select all (Ctrl+A) and hit Delete or Backspace
   - Input becomes empty
5. **State After Value Cleared**: Partial multi-condition with 5 badges
   - Badges: `[Harga Pokok][Greater Than or Equal][50000][AND][Less Than]`
   - Second operator badge visible but no second value
6. **Critical Step - Delete Second Operator**: Hit Delete key

**Expected Result After Step 6**:

- Second operator badge removed: `[Harga Pokok][Greater Than or Equal][50000][AND]`
- **Operator selector modal opens automatically**
- Modal ready for selecting new second operator
- Input remains empty and focused
- Partial join state maintained (AND badge still visible)

**Continue Flow**:

7. Select "Less Than or Equal" from operator selector
8. Type "80000", press Enter

**Final Expected Result**:

- Complete multi-condition: `[Harga Pokok][Greater Than or Equal][50000][AND][Less Than or Equal][80000]`
- Filter panel shows: ">= 50000 AND <= 80000"
- Data grid shows items where 50,000 <= Harga Pokok <= 80,000
- Seamless editing experience without needing to click AND badge

**Validates**:

- Progressive deletion flow works correctly from 6 badges → 5 badges → 4 badges with operator selector
- Delete key in partial multi-condition (5 badges) removes second operator
- Operator selector automatically opens after deleting second operator
- Enables quick operator change without manual badge interaction
- Partial join state (AND/OR) preserved during second operator deletion
- Smooth UX: delete → modal opens → select new operator → continue
- Input focus maintained throughout deletion sequence
- System correctly handles state transitions: confirmed multi-condition → partial multi-condition → partial join with operator selector

**Key Focus**: This test validates the seamless deletion-to-edit flow where removing the second operator automatically presents the user with operator choices, streamlining the filter editing experience.

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
- **Between Operator Tests**: 2 scenarios (B0: between operator with space-separated values creating 5 badges, B1: between operator with multi-condition AND creating 8 badges)
- **Deletion Tests**: 8 scenarios (D0: delete operator badge 2→1 badges, D1-D2: simple filter deletions, D2a: delete 1st operator multi-condition, D3-D5: multi-condition targeted deletions, D6: progressive deletion 6→0 badges)
- **Edit Tests**: 10 scenarios (E0: column badge 2-badges, E1: column badge 3-badges with sync, E2: value badge simple, E3: 2nd value multi-condition, E4: 1st value multi-condition, E5: join operator badge 5-badges, E6: column badge 6-badges multi-condition, E7: 1st operator badge 6-badges multi-condition, E8: column badge 5-badges partial multi-condition, E9: delete 2nd operator via backspace progressive deletion)
- **Total**: 25 test scenarios

### Key Behaviors Tested:

- Badge creation and rendering
- User interactions (click, type, keyboard)
- State management and transitions
- Data synchronization
- Cascading deletions
- Between operator with space-separated values (range filtering)
- Between operator in multi-condition filters (combined with AND/OR)
- Badge editing (column badge, operator badges, value badges, join operator badge)
- Operator preservation during column edit
- Operator editing in multi-condition filters
- Join operator editing with partial multi-condition
- Auto-opening selectors
- Filter panel updates
- Data grid filtering
- Partial multi-condition state handling
