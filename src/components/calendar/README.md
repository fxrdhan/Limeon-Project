# Calendar Component

A powerful, accessible React calendar/datepicker component with Indonesian localization, keyboard navigation, hover interactions, and flexible positioning system.

## Overview

The Calendar component is a sophisticated date selection interface that can function as both a standalone calendar and a datepicker with input field. It features smooth animations, comprehensive keyboard navigation, intelligent positioning, and full accessibility support with Indonesian language defaults.

**Key Features:**

- **Dual Modes**: Datepicker with input field or inline calendar
- **Indonesian Localization**: Built-in Indonesian month names and date formatting
- **Smart Positioning**: Automatic up/down positioning based on viewport space
- **Keyboard Navigation**: Complete arrow key navigation with Enter/Escape support
- **Hover Interactions**: Optional hover-to-open functionality
- **Date Range Validation**: Min/max date constraints
- **Accessibility**: Full ARIA support and screen reader compatibility
- **Animation System**: Smooth open/close transitions with state management
- **Portal Rendering**: Overlays render in React portals for proper z-index layering

## Current Architecture

### Design Patterns

**Context-Provider Pattern**: Eliminates prop drilling by managing all state through React Context.

```tsx
<CalendarProvider value={...} onChange={...}>
  <CalendarContent />
</CalendarProvider>
```

**Custom Hooks Architecture**: Complex logic is encapsulated into specialized, composable hooks:

```tsx
// State management
const { isOpen, openCalendar, closeCalendar } = useCalendarState();

// Positioning logic
const { portalStyle, dropDirection } = useCalendarPosition();

// Navigation behavior
const { navigateViewDate } = useCalendarNavigation();

// Keyboard interactions
const { handleCalendarKeyDown } = useCalendarKeyboard();

// Hover behavior
const { handleTriggerMouseEnter } = useCalendarHover();
```

**Portal-Based Rendering**: Calendar overlay renders in a portal for proper layering and positioning.

**Component Composition**: Built from focused, single-responsibility components that compose together.

### Core Architecture Components

```
CalendarProvider (Context Provider)
├── CalendarButton (Datepicker Input)
└── CalendarPortal (Portal Container)
    ├── CalendarHeader (Month/Year Navigation)
    └── DaysGrid (Date Selection Grid)
```

## Current Features

### 1. Mode Flexibility

- **Datepicker Mode**: Input field that opens calendar overlay
- **Inline Mode**: Standalone calendar widget displayed inline

### 2. Date Selection & Navigation

- Single date selection with onChange callback
- Month/year header navigation with dropdowns
- Previous/next navigation buttons
- Direct year selection through dropdown

### 3. Keyboard Navigation

- `Arrow Keys`: Navigate through dates
- `Enter`: Select highlighted date
- `Escape`: Close calendar
- `Tab`: Focus management and close
- `Page Up/Down`: Navigate months/years quickly

### 4. Mouse Interactions

- Click to select dates
- Hover highlighting
- Optional hover-to-open (configurable delay)
- Click outside to close

### 5. Positioning System

- Automatic position calculation relative to trigger
- Viewport-aware positioning (up/down detection)
- Configurable portal width
- Resizable calendar support (with size constraints)

### 6. Size Presets

- **md**: 320x300px (min: 300x300, max: 380x380) - Default
- **lg**: 380x360px (min: 340x320, max: 450x420)
- **xl**: 450x400px (min: 400x360, max: 520x480)

### 7. Animation System

#### 7.1 Open/Close Transitions

- Open/close transitions (200ms duration)
- Smooth state transitions with intermediate states
- Focus management during animations

#### 7.2 Month/Year Navigation Animations (Framer Motion)

The calendar implements sophisticated swipe animations for month and year navigation using Framer Motion through the `DaysGrid` component with `animated={true}` prop:

**Animation Architecture:**

- **Horizontal swipe** for month navigation (left/right)
- **Vertical swipe** for year navigation (up/down)
- Uses `AnimatePresence` with `mode="wait"` for seamless transitions
- Material Design easing curve `[0.4, 0.0, 0.2, 1]` for natural motion

**Technical Implementation:**

```tsx
// State management for tracking animation direction
const [navigationDirection, setNavigationDirection] = useState<
  'prev' | 'next' | null
>(null);
const [yearNavigationDirection, setYearNavigationDirection] = useState<
  'prev' | 'next' | null
>(null);

// Unique key generation for AnimatePresence
const gridKey = `${displayDate.getFullYear()}-${displayDate.getMonth()}`;

// Animation configuration
<AnimatePresence mode="wait" initial={false}>
  <motion.div
    key={gridKey} // Triggers re-render and animation
    initial={getAnimationDirection()} // Start position based on direction
    animate={{ x: 0, y: 0 }} // Always animate to center
    exit={getExitDirection()} // Exit in opposite direction
    transition={{
      type: 'tween',
      ease: [0.4, 0.0, 0.2, 1], // Material Design curve
      duration: 0.25, // 250ms for smooth feel
    }}
  >
    {renderDatesGrid(displayDate)}
  </motion.div>
</AnimatePresence>;
```

**Direction Calculations:**

```tsx
// Initial position based on navigation direction
const getAnimationDirection = () => {
  // Year navigation (vertical movement)
  if (yearNavigationDirection === 'prev') return { y: '-100%', x: 0 }; // Enter from top
  if (yearNavigationDirection === 'next') return { y: '100%', x: 0 }; // Enter from bottom

  // Month navigation (horizontal movement)
  if (navigationDirection === 'prev') return { x: '-100%', y: 0 }; // Enter from left
  if (navigationDirection === 'next') return { x: '100%', y: 0 }; // Enter from right

  return { x: 0, y: 0 }; // No animation on initial render
};

// Exit position (opposite of entry for smooth transition)
const getExitDirection = () => {
  // Year navigation
  if (yearNavigationDirection === 'prev') return { y: '100%', x: 0 }; // Exit to bottom
  if (yearNavigationDirection === 'next') return { y: '-100%', x: 0 }; // Exit to top

  // Month navigation
  if (navigationDirection === 'prev') return { x: '100%', y: 0 }; // Exit to right
  if (navigationDirection === 'next') return { x: '-100%', y: 0 }; // Exit to left

  return { x: 0, y: 0 };
};
```

**Animation Flow Control:**

1. **Navigation Trigger**: User clicks prev/next month or changes year
2. **Direction Setting**: `navigationDirection` or `yearNavigationDirection` is set
3. **Key Update**: New `gridKey` triggers AnimatePresence
4. **Animation Execution**:
   - Old grid exits in opposite direction
   - New grid enters from corresponding direction
   - Both animate over 250ms with Material easing
5. **Cleanup**: Direction state cleared after 300ms

**Performance Optimizations:**

- Container has `overflow-hidden` to hide sliding elements
- Static day labels remain fixed during animation
- Uses `tween` animation type for consistent performance
- Direction state auto-clears to prevent memory leaks

**Files Involved:**

- `components/DaysGrid.tsx`: Main animation implementation (via `animated` prop)
- `providers/CalendarContext.tsx`: Direction state management
- `hooks/useCalendarNavigation.ts`: Navigation logic

### 8. Date Validation

- Min/max date constraints
- Range validation for dates, months, and years
- Disabled state styling for invalid dates

### 9. Indonesian Localization

- Indonesian month names (Januari, Februari, etc.)
- Indonesian day labels (Sen, Sel, Rab, etc.)
- Indonesian date formatting (dd MMM yyyy)
- Indonesian locale for all date operations

## Code Structure

```
calendar/
  index.tsx                      # Main component orchestrator
  README.md                      # This documentation
  constants.ts                   # Configuration constants & localization

  types/                         # TypeScript interfaces
    components.ts                # Component prop interfaces
    context.ts                   # Context state definitions
    hooks.ts                     # Hook parameter interfaces
    index.ts                     # Type exports

  providers/                     # React Context
    CalendarContext.tsx          # Main provider implementation
    calendarContext.ts           # Context definition
    index.ts                     # Provider exports

  components/                    # UI Components
    CalendarButton.tsx           # Datepicker input field
    CalendarHeader.tsx           # Month/year navigation
    CalendarPortal.tsx           # Portal container
    DaysGrid.tsx                # Date selection grid (supports animated prop)
    MonthsGrid.tsx              # Month selection grid
    YearsGrid.tsx               # Year selection grid
    index.ts                    # Component exports

  hooks/                         # Custom hooks
    useCalendarContext.ts        # Context consumer hook
    useCalendarHover.ts          # Hover behavior logic
    useCalendarKeyboard.ts       # Keyboard navigation
    useCalendarNavigation.ts     # Date navigation utilities
    useCalendarPosition.ts       # Positioning calculations
    useCalendarState.ts          # Open/close state management
    index.ts                     # Hook exports

  utils/                         # Utility functions
    calendarUtils.ts             # Date calculations & formatting
    index.ts                     # Utility exports
```

### Key Files Deep Dive

**index.tsx**: Main component that combines CalendarProvider with CalendarContent. Handles mode switching and prop distribution.

**providers/CalendarContext.tsx**: Central state management with all hooks integrated. Manages:

- Open/close states with animation timing
- Date selection and navigation
- Positioning calculations
- Event handlers (click, keyboard, hover)
- Refs for DOM interactions

**hooks/useCalendarState.ts**: Manages opening/closing with proper animation timing:

```tsx
const { isOpen, isClosing, isOpening, openCalendar, closeCalendar } =
  useCalendarState({
    onOpen: () => setHighlightedDate(value || new Date()),
    onClose: () => setHighlightedDate(null),
  });
```

**hooks/useCalendarPosition.ts**: Calculates portal positioning:

- Measures trigger element position
- Detects viewport space availability
- Returns CSS styles and drop direction
- Handles resizing and width constraints

**utils/calendarUtils.ts**: Core date manipulation utilities:

- Date validation and range checking
- Calendar grid generation
- Date formatting with Indonesian locale
- Navigation helpers (prev/next month/year)

## Development Techniques

### 1. Context State Management

The component uses a comprehensive context to eliminate prop drilling:

```tsx
// All state and handlers available via context
const {
  value,
  onChange, // Core date state
  isOpen,
  openCalendar,
  closeCalendar, // Open/close state
  displayDate,
  setDisplayDate, // Navigation state
  highlightedDate,
  setHighlightedDate, // Keyboard highlighting
  handleDateSelect, // Event handlers
  portalStyle,
  dropDirection, // Positioning data
  triggerInputRef,
  portalContentRef, // DOM refs
} = useCalendarContext();
```

### 2. Custom Hook Composition

Complex behaviors are split into focused, testable hooks:

```tsx
// Each hook handles one concern
const stateHook = useCalendarState({ onOpen, onClose });
const positionHook = useCalendarPosition({ triggerRef, portalRef, isOpen });
const navHook = useCalendarNavigation({ displayDate, setDisplayDate });
const keyboardHook = useCalendarKeyboard({
  isOpen,
  highlightedDate,
  onDateSelect,
});
const hoverHook = useCalendarHover({ openCalendar, closeCalendar });
```

### 3. Animation State Machine

The component manages multiple animation states:

```tsx
// Animation states for smooth transitions
type AnimationState = {
  isOpen: boolean; // Calendar is visible
  isClosing: boolean; // Closing animation in progress
  isOpening: boolean; // Opening animation in progress
};

// Prevents interaction conflicts during transitions
const canInteract = isOpen && !isClosing && !isOpening;
```

### 4. Intelligent Positioning

Portal positioning uses comprehensive viewport calculations:

```tsx
const calculatePosition = () => {
  const trigger = triggerRef.current?.getBoundingClientRect();
  const viewport = { height: window.innerHeight, width: window.innerWidth };

  // Determine if there's space below or above
  const spaceBelow = viewport.height - trigger.bottom - VIEWPORT_MARGIN;
  const spaceAbove = trigger.top - VIEWPORT_MARGIN;

  const dropDirection = spaceBelow >= calendarHeight ? 'down' : 'up';

  return {
    position: 'fixed',
    left: trigger.left,
    top:
      dropDirection === 'down'
        ? trigger.bottom + POSITION_MARGIN
        : trigger.top - calendarHeight - POSITION_MARGIN,
    zIndex: PORTAL_Z_INDEX,
  };
};
```

### 5. Type-Safe Development

Comprehensive TypeScript interfaces ensure type safety:

```tsx
// All props are strictly typed
interface CalendarProps {
  mode?: 'datepicker' | 'inline';
  size?: 'md' | 'lg' | 'xl';
  value: Date | null;
  onChange: (date: Date | null) => void;
  minDate?: Date;
  maxDate?: Date;
  portalWidth?: string | number;
}

// Context state is fully typed
interface CalendarContextState {
  // ... all state properties with explicit types
}
```

### 6. Indonesian Localization Integration

Built-in Indonesian language support:

```tsx
// Constants for Indonesian localization
const MONTH_NAMES_ID = ['Januari', 'Februari', 'Maret', ...];
const DAY_LABELS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

// Date formatting with Indonesian locale
const formatDisplayValue = (value: Date | null): string => {
  return value?.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }) ?? '';
};
```

### 7. Performance Optimization Strategies

- **useCallback**: All event handlers are memoized to prevent unnecessary re-renders
- **Context Optimization**: Context value is memoized to prevent cascade re-renders
- **Ref-Based DOM Access**: Direct DOM manipulation for positioning calculations
- **Strategic State Updates**: Minimal state changes during animations

### 8. Accessibility Implementation

```tsx
// ARIA attributes for screen readers
<div
  role="grid"
  aria-label="Calendar"
  aria-activedescendant={`date-${highlightedDate?.getDate()}`}
  tabIndex={0}
  onKeyDown={handleCalendarKeyDown}
>
  <div role="row">
    <button
      role="gridcell"
      aria-selected={isSelected}
      aria-disabled={isDisabled}
      onClick={() => handleDateSelect(date)}
    >
      {date.getDate()}
    </button>
  </div>
</div>
```

### 9. Testing Approach

The modular architecture enables focused testing:

```tsx
// Test individual hooks in isolation
test('useCalendarState manages open/close correctly', () => {
  const { result } = renderHook(() => useCalendarState({ onOpen: jest.fn() }));

  act(() => result.current.openCalendar());
  expect(result.current.isOpen).toBe(true);
});

// Test components with mocked context
test('CalendarButton displays formatted date', () => {
  render(
    <CalendarContext.Provider value={mockContextValue}>
      <CalendarButton value={new Date('2023-12-25')} />
    </CalendarContext.Provider>
  );

  expect(screen.getByDisplayValue('25 Des 2023')).toBeInTheDocument();
});
```

### 10. Extension Points

The architecture supports easy extension:

```tsx
// Add new view types by extending the CalendarView union
type CalendarView = 'days' | 'months' | 'years' | 'decades';

// Add new hook behaviors
const useCalendarMultiSelect = () => {
  // Multi-select logic
};

// Extend context with new features
interface ExtendedCalendarContext extends CalendarContextState {
  selectedDates: Date[];
  onMultiDateSelect: (dates: Date[]) => void;
}
```

## Usage Examples

### Basic Datepicker

```tsx
const [selectedDate, setSelectedDate] = useState<Date | null>(null);

<Calendar
  mode="datepicker"
  value={selectedDate}
  onChange={setSelectedDate}
  placeholder="Pilih tanggal"
  label="Tanggal Lahir"
/>;
```

### Inline Calendar

```tsx
<Calendar
  mode="inline"
  size="lg"
  value={selectedDate}
  onChange={setSelectedDate}
/>
```

### With Date Constraints

```tsx
const minDate = new Date('2023-01-01');
const maxDate = new Date('2023-12-31');

<Calendar
  value={selectedDate}
  onChange={setSelectedDate}
  minDate={minDate}
  maxDate={maxDate}
  size="md"
/>;
```

### Custom Portal Width

```tsx
<Calendar
  value={selectedDate}
  onChange={setSelectedDate}
  portalWidth={400}
  resizable={true}
/>
```

### Using DaysGrid Component Directly

```tsx
// With animation
<DaysGrid
  displayDate={new Date()}
  value={selectedDate}
  highlightedDate={null}
  onDateSelect={handleDateSelect}
  onDateHighlight={handleDateHighlight}
  animated={true}
/>

// Without animation (static)
<DaysGrid
  displayDate={new Date()}
  value={selectedDate}
  highlightedDate={null}
  onDateSelect={handleDateSelect}
  onDateHighlight={handleDateHighlight}
  animated={false}
/>
```
