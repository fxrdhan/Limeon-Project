# Dropdown Component

A flexible, accessible React dropdown component with search functionality, keyboard navigation, and validation support.

## Features

- **Search & Filter**: Built-in search with real-time filtering
- **Keyboard Navigation**: Full arrow key and Enter/Escape support
- **Validation**: Form validation with custom error messages
- **Accessibility**: ARIA labels, roles, and keyboard navigation
- **Positioning**: Automatic up/down positioning based on viewport
- **Text Expansion**: Expandable text for long option names
- **Radio Mode**: Optional radio button indicators
- **Hover to Open**: Optional hover activation
- **TypeScript**: Full type safety with organized interfaces

## Basic Usage

```tsx
import Dropdown from '@/components/dropdown';

const MyComponent = () => {
  const [selectedValue, setSelectedValue] = useState('');

  const options = [
    { id: '1', name: 'Option 1' },
    { id: '2', name: 'Option 2' },
    { id: '3', name: 'Option 3' },
  ];

  return (
    <Dropdown
      options={options}
      value={selectedValue}
      onChange={setSelectedValue}
      placeholder="Select an option"
    />
  );
};
```

## Props API

### Required Props

| Prop       | Type                                | Description                  |
| ---------- | ----------------------------------- | ---------------------------- |
| `options`  | `Array<{id: string, name: string}>` | List of selectable options   |
| `value`    | `string`                            | Currently selected option ID |
| `onChange` | `(optionId: string) => void`        | Handler for option selection |

### Optional Props

| Prop                      | Type                           | Default         | Description                              |
| ------------------------- | ------------------------------ | --------------- | ---------------------------------------- |
| `placeholder`             | `string`                       | `"-- Pilih --"` | Placeholder text when no option selected |
| `searchList`              | `boolean`                      | `true`          | Enable search functionality              |
| `withRadio`               | `boolean`                      | `false`         | Show radio button indicators             |
| `required`                | `boolean`                      | `false`         | Mark field as required for validation    |
| `validate`                | `boolean`                      | `false`         | Enable form validation                   |
| `showValidationOnBlur`    | `boolean`                      | `true`          | Show validation errors on blur           |
| `validationAutoHide`      | `boolean`                      | `true`          | Auto-hide validation messages            |
| `validationAutoHideDelay` | `number`                       | `undefined`     | Delay before auto-hiding validation      |
| `hoverToOpen`             | `boolean`                      | `false`         | Open dropdown on hover                   |
| `onAddNew`                | `(searchTerm: string) => void` | `undefined`     | Handler for adding new options           |
| `name`                    | `string`                       | `undefined`     | Form field name for validation           |
| `tabIndex`                | `number`                       | `undefined`     | Tab order for accessibility              |

## Advanced Examples

### With Search and Add New

```tsx
<Dropdown
  options={options}
  value={selectedValue}
  onChange={setSelectedValue}
  searchList={true}
  onAddNew={searchTerm => {
    const newOption = { id: Date.now().toString(), name: searchTerm };
    setOptions(prev => [...prev, newOption]);
    setSelectedValue(newOption.id);
  }}
  placeholder="Search or add new option"
/>
```

### With Validation

```tsx
<Dropdown
  options={options}
  value={selectedValue}
  onChange={setSelectedValue}
  required={true}
  validate={true}
  name="category"
  showValidationOnBlur={true}
  validationAutoHide={true}
  validationAutoHideDelay={3000}
/>
```

### With Radio Buttons

```tsx
<Dropdown
  options={options}
  value={selectedValue}
  onChange={setSelectedValue}
  withRadio={true}
  searchList={false}
  placeholder="Choose one option"
/>
```

### Hover to Open

```tsx
<Dropdown
  options={options}
  value={selectedValue}
  onChange={setSelectedValue}
  hoverToOpen={true}
  placeholder="Hover to open"
/>
```

## Keyboard Navigation

| Key                 | Action                           |
| ------------------- | -------------------------------- |
| `ArrowDown`         | Navigate to next option          |
| `ArrowUp`           | Navigate to previous option      |
| `Enter`             | Select highlighted option        |
| `Escape`            | Close dropdown                   |
| `Tab`               | Move focus and close dropdown    |
| `PageDown`/`PageUp` | Navigate quickly through options |

## Architecture

### Component Structure

```
dropdown/
├── index.tsx                    # Main component orchestrator
├── constants.ts                 # Configuration constants
├── types/                       # TypeScript interfaces
│   ├── context.ts              # Context type definitions
│   ├── hooks.ts                # Hook parameter interfaces
│   ├── components.ts           # Component prop interfaces
│   └── index.ts                # Type exports
├── providers/                   # React Context
│   ├── DropdownContext.tsx     # Context provider component
│   └── dropdownContext.ts      # Context definition
├── components/                    # UI Components
│   ├── DropdownButton.tsx      # Main button
│   ├── DropdownMenu.tsx        # Menu container
│   ├── SearchBar.tsx           # Search input
│   ├── OptionItem.tsx          # Individual option
│   ├── button/                 # Button sub-components
│   ├── search/                 # Search sub-components
│   ├── menu/                   # Menu sub-components
│   └── options/                # Option sub-components
├── hooks/                       # Custom hooks
│   ├── useDropdownState.ts     # Open/close state
│   ├── useDropdownValidation.ts# Form validation
│   ├── useDropdownPosition.ts  # Positioning logic
│   ├── useDropdownContext.ts   # Context access
│   ├── search/                 # Search-related hooks
│   ├── keyboard/               # Keyboard navigation hooks
│   └── [other hooks]
└── utils/                       # Utility functions
    └── dropdownUtils.ts        # Helper functions
```

### Design Patterns

**Context Pattern**: Eliminates prop drilling by sharing state through React Context

```tsx
// Components access shared state via context
const { isOpen, filteredOptions, onSelect } = useDropdownContext();
```

**Custom Hooks**: Encapsulates complex logic into reusable, testable units

```tsx
// State management
const { isOpen, toggleDropdown } = useDropdownState();

// Search functionality
const { searchTerm, handleSearchChange } = useSearch();

// Keyboard navigation
const { highlightedIndex, handleNavigate } = useNavigationState();
```

**Atomic Design**: Components are broken down into focused, single-responsibility units

```tsx
// Composed from smaller components
<DropdownMenu>
  <SearchBar />
  <MenuContent>
    <OptionItem />
  </MenuContent>
</DropdownMenu>
```

## Validation

The dropdown integrates with form validation systems:

```tsx
// Validation states
const validationStates = {
  idle: 'No validation performed',
  valid: 'Field passes validation',
  invalid: 'Field has validation errors',
};

// Custom validation logic can be added
const customValidate = (value: string) => {
  if (!value) return 'This field is required';
  if (value === 'invalid') return 'Invalid option selected';
  return null;
};
```

## Accessibility

- **ARIA Labels**: Proper labeling for screen readers
- **Keyboard Navigation**: Full keyboard support
- **Focus Management**: Logical focus flow
- **Role Attributes**: Semantic HTML roles
- **Screen Reader Support**: Announces state changes

## Performance

- **Debounced Search**: Prevents excessive filtering during typing
- **Virtualization Ready**: Structure supports virtual scrolling for large lists
- **Context Optimization**: Minimizes unnecessary re-renders
- **Memoization**: Strategic use of React.memo and useCallback

## Customization

### Styling

The component uses Tailwind CSS classes that can be customized:

```tsx
// Override default classes via CSS modules or styled-components
.dropdown-button {
  @apply your-custom-classes;
}
```

### Constants

Modify behavior through constants:

```tsx
// constants.ts
export const DROPDOWN_CONSTANTS = {
  ANIMATION_DURATION: 100,
  DEBOUNCE_DELAY: 150,
  MAX_HEIGHT: 240,
  VIEWPORT_MARGIN: 16,
};
```

## Contributing

When modifying the component:

1. Maintain single responsibility principle
2. Update TypeScript interfaces in `types/` folder
3. Write unit tests for new functionality
4. Follow existing naming conventions
5. Update this documentation for API changes
