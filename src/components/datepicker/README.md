# Datepicker Component

A flexible, accessible React datepicker component with multi-view navigation, keyboard support, and Indonesian localization.

## Features

- **Multi-View Calendar**: Days, months, and years view with smooth transitions
- **Keyboard Navigation**: Full arrow key support with Ctrl modifiers for quick navigation
- **Date Range Validation**: Min/max date constraints with visual feedback
- **Indonesian Localization**: Indonesian month names and date formatting
- **Accessibility**: ARIA labels, roles, and comprehensive keyboard navigation
- **Portal Positioning**: Automatic up/down positioning based on viewport
- **Hover Interaction**: Optional hover-to-open functionality
- **TypeScript**: Full type safety with organized interfaces

## Basic Usage

```tsx
import Datepicker from '@/components/datepicker';

const MyComponent = () => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  return (
    <Datepicker
      value={selectedDate}
      onChange={setSelectedDate}
      placeholder="Pilih tanggal"
      label="Tanggal"
    />
  );
};
```

## Props API

### Required Props

| Prop | Type | Description |
|------|------|-------------|
| `value` | `Date \| null` | Currently selected date |
| `onChange` | `(date: Date \| null) => void` | Handler for date selection |

### Optional Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | `undefined` | Label text displayed above the input |
| `placeholder` | `string` | `"Pilih tanggal"` | Placeholder text when no date selected |
| `inputClassName` | `string` | `undefined` | Additional CSS classes for input element |
| `minDate` | `Date` | `undefined` | Minimum selectable date |
| `maxDate` | `Date` | `undefined` | Maximum selectable date |
| `portalWidth` | `string \| number` | `undefined` | Custom width for calendar portal |

## Advanced Examples

### With Date Range Validation

```tsx
const today = new Date();
const oneMonthFromNow = new Date();
oneMonthFromNow.setMonth(today.getMonth() + 1);

<Datepicker
  value={selectedDate}
  onChange={setSelectedDate}
  label="Tanggal Pengiriman"
  minDate={today}
  maxDate={oneMonthFromNow}
  placeholder="Pilih tanggal pengiriman"
/>
```

### With Custom Portal Width

```tsx
<Datepicker
  value={selectedDate}
  onChange={setSelectedDate}
  portalWidth="320px"
  inputClassName="border-2 border-blue-300"
  label="Tanggal Event"
/>
```

### Form Integration

```tsx
const [formData, setFormData] = useState({
  startDate: null,
  endDate: null,
});

<div className="grid grid-cols-2 gap-4">
  <Datepicker
    value={formData.startDate}
    onChange={(date) => setFormData(prev => ({ ...prev, startDate: date }))}
    label="Tanggal Mulai"
    maxDate={formData.endDate || undefined}
  />

  <Datepicker
    value={formData.endDate}
    onChange={(date) => setFormData(prev => ({ ...prev, endDate: date }))}
    label="Tanggal Selesai"
    minDate={formData.startDate || undefined}
  />
</div>
```

## Keyboard Navigation

### Input Field Navigation

| Key | Action |
|-----|--------|
| `Enter` | Open calendar or select highlighted date/month/year |
| `Escape` | Close calendar |
| `Tab` | Move focus (calendar stays open) |

### Calendar Navigation

#### Days View
| Key Combination | Action |
|----------------|--------|
| `ArrowLeft/Right` | Navigate day by day |
| `ArrowUp/Down` | Navigate week by week |
| `Ctrl + ArrowLeft/Right` | Navigate month by month |
| `Ctrl + ArrowUp/Down` | Navigate year by year |
| `Enter` | Select highlighted date |
| `Escape` | Close calendar |

#### Months View
| Key | Action |
|-----|--------|
| `ArrowLeft/Right` | Navigate month by month |
| `ArrowUp/Down` | Navigate by 3 months |
| `Enter` | Select month and switch to days view |
| `Escape` | Switch to days view |

#### Years View
| Key | Action |
|-----|--------|
| `ArrowLeft/Right` | Navigate year by year |
| `ArrowUp/Down` | Navigate by 3 years |
| `Enter` | Select year and switch to months view |
| `Escape` | Switch to months view |

## Architecture

### Component Structure

```
datepicker/
├── index.tsx                    # Main component orchestrator
├── constants.ts                 # Configuration constants
├── types/                       # TypeScript interfaces
│   ├── context.ts              # Context type definitions
│   ├── hooks.ts                # Hook parameter interfaces
│   ├── components.ts           # Component prop interfaces
│   └── index.ts                # Type exports
├── providers/                   # React Context
│   ├── DatepickerContext.tsx   # Context provider component
│   └── datepickerContext.ts    # Context definition
├── components/                  # UI Components
│   ├── CalendarButton.tsx      # Input trigger button
│   ├── CalendarPortal.tsx      # Portal container
│   ├── CalendarHeader.tsx      # Navigation header
│   ├── DaysGrid.tsx           # Days calendar grid
│   ├── MonthsGrid.tsx         # Months selection grid
│   └── YearsGrid.tsx          # Years selection grid
├── hooks/                       # Custom hooks
│   ├── useDatepickerState.ts   # Open/close state management
│   ├── useDatepickerPosition.ts# Portal positioning logic
│   ├── useDatepickerNavigation.ts# Calendar navigation
│   ├── useDatepickerKeyboard.ts# Keyboard event handling
│   ├── useDatepickerHover.ts   # Hover interaction
│   └── useDatepickerContext.ts # Context access hook
└── utils/                       # Utility functions
    └── datepickerUtils.ts      # Date calculation helpers
```

### Design Patterns

**Context Pattern**: Eliminates prop drilling by sharing state through React Context

```tsx
// Components access shared state via context
const { value, currentView, handleDateSelect } = useDatepickerContext();
```

**Custom Hooks**: Encapsulates complex logic into reusable, testable units

```tsx
// State management
const { isOpen, openCalendar, closeCalendar } = useDatepickerState();

// Keyboard navigation
const { handleInputKeyDown, handleCalendarKeyDown } = useDatepickerKeyboard();

// Portal positioning
const { portalStyle, dropDirection } = useDatepickerPosition();
```

**Atomic Design**: Components are broken down into focused, single-responsibility units

```tsx
// Composed from smaller components
<DatepickerProvider>
  <CalendarButton />
  <CalendarPortal>
    <CalendarHeader />
    <DaysGrid />
  </CalendarPortal>
</DatepickerProvider>
```

## Date Validation

The datepicker provides comprehensive date validation:

```tsx
// Date range validation
const isDateInRange = (date, minDate, maxDate) => {
  // Validates if date falls within allowed range
};

// Month validation
const isMonthInRange = (year, month, minDate, maxDate) => {
  // Validates if entire month has selectable dates
};

// Year validation
const isYearInRange = (year, minDate, maxDate) => {
  // Validates if year contains selectable dates
};
```

## Localization

Indonesian localization is built-in:

```tsx
// Indonesian month names
const MONTH_NAMES_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

// Indonesian day labels
const DAY_LABELS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

// Indonesian date formatting
const formatDisplayValue = (date) => {
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
};
```

## Accessibility

- **ARIA Labels**: Proper labeling for screen readers
- **Keyboard Navigation**: Complete keyboard support for all interactions
- **Focus Management**: Logical focus flow throughout calendar views
- **Role Attributes**: Semantic HTML roles for better screen reader support
- **Date Announcements**: Screen reader announcements for date selections

## Performance

- **Portal Rendering**: Efficient DOM portal for calendar overlay
- **Context Optimization**: Minimizes unnecessary re-renders
- **Memoization**: Strategic use of React.memo and useCallback
- **Event Delegation**: Optimized event handling for calendar grids
- **Position Caching**: Cached position calculations for smooth interactions

## Customization

### Styling

The component uses Tailwind CSS classes that can be customized:

```tsx
// Override default classes via CSS modules or styled-components
.datepicker-input {
  @apply your-custom-input-classes;
}

.datepicker-calendar {
  @apply your-custom-calendar-classes;
}
```

### Constants

Modify behavior through constants:

```tsx
// constants.ts
export const DATEPICKER_CONSTANTS = {
  CALENDAR_HEIGHT: 320,
  ANIMATION_DURATION: 200,
  HOVER_OPEN_DELAY: 150,
  CALENDAR_WIDTH: 280,
  PORTAL_Z_INDEX: 1050,
};
```

## Contributing

When modifying the component:

1. Maintain single responsibility principle for each component
2. Update TypeScript interfaces in `types/` folder
3. Write unit tests for new functionality
4. Follow existing naming conventions
5. Update this documentation for API changes
6. Ensure keyboard navigation still works correctly
7. Test with screen readers for accessibility
