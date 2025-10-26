# Dropdown Component Documentation

## Overview

The `Dropdown` component is a highly customizable React component designed for single or multiple option selection from a list of options. It supports various modes, features, and interaction patterns to provide a rich user experience for form inputs.

## Features

- **Selection Modes**: Single selection (radio) or multiple selection (checkbox)
- **Display Modes**: `input` mode (with input-like styling) and `text` mode (button-like)
- **Search Functionality**: Built-in search to filter options
- **Validation**: Customizable validation with error overlay
- **Hover Details**: Optional hover-to-show additional details
- **Keyboard Navigation**: Full keyboard accessibility
- **Positioning**: Automatic positioning with manual override options
- **Animation**: Smooth open/close animations
- **Accessibility**: ARIA compliant with focus management
- **TypeScript**: Fully typed with comprehensive interfaces

## Component Structure

The Dropdown component is organized into several modules:

- **Main Component**: `index.tsx` - The root component
- **Sub-components**:
  - `DropdownButton`: The trigger element
  - `DropdownMenu`: The menu container
  - `HoverDetailPortal`: For hover detail popups
- **Hooks**: Various custom hooks for state management
- **Providers**: Context provider for state sharing
- **Types**: TypeScript interfaces and types
- **Utils**: Utility functions
- **Constants**: Configuration constants

## Props Interface

### DropdownProps (Single Selection)

```src/types/components.ts#L29-39
export interface DropdownProps {
  mode?: DropdownMode;
  options: DropdownOption[];
  value: string;
  tabIndex?: number;
  onChange: (value: string) => void;
  placeholder?: string;
  name: string;
  required?: boolean;
  onAddNew?: (searchTerm?: string) => void;
  withRadio?: boolean;
  searchList?: boolean;
  validate?: boolean;
  showValidationOnBlur?: boolean;
  validationAutoHide?: boolean;
  validationAutoHideDelay?: number;
  hoverToOpen?: boolean;
  // Portal width control
  portalWidth?: DropdownPortalWidth;
  // Position control
  position?: DropdownPosition;
  // Alignment control
  align?: DropdownAlign;
  // Hover detail functionality
  enableHoverDetail?: boolean;
  hoverDetailDelay?: number;
  onFetchHoverDetail?: (optionId: string) => Promise<HoverDetailData | null>;
}
```

### CheckboxDropdownProps (Multiple Selection)

```src/types/components.ts#L45-51
export interface CheckboxDropdownProps
  extends Omit<DropdownProps, 'value' | 'onChange' | 'withRadio'> {
  value: string[];
  onChange: (value: string[]) => void;
  withCheckbox: true;
}
```

### DropdownOption

```src/types/components.ts#L6-12
export interface DropdownOption {
  id: string;
  name: string;
  code?: string;
  description?: string;
  updated_at?: string | null;
}
```

### Types

- `DropdownMode`: `'input' | 'text'`
- `DropdownPortalWidth`: `'auto' | 'content' | string | number`
- `DropdownPosition`: `'auto' | 'top' | 'bottom' | 'left'`
- `DropdownAlign`: Defined in related types
- `HoverDetailData`: Interface for hover detail content

## Usage Examples

### Basic Single Selection

```src/components/dropdown/index.tsx#L123-456
// Example usage (pseudo-code)
<Dropdown
  mode="input"
  options={[
    { id: '1', name: 'Option 1' },
    { id: '2', name: 'Option 2' }
  ]}
  value="1"
  onChange={(value) => console.log(value)}
  placeholder="-- Pilih --"
  name="my-dropdown"
/>
```

### Multiple Selection (Checkbox)

```src/components/dropdown/index.tsx#L123-456
<Dropdown
  mode="input"
  options={[
    { id: '1', name: 'Option 1' },
    { id: '2', name: 'Option 2' }
  ]}
  value={['1']}
  onChange={(values) => console.log(values)}
  placeholder="-- Pilih --"
  name="my-checkbox-dropdown"
  withCheckbox={true}
/>
```

### With Validation and Hover Details

```src/components/dropdown/index.tsx#L123-456
<Dropdown
  options={options}
  value={value}
  onChange={setValue}
  placeholder="-- Pilih --"
  name="my-dropdown"
  required={true}
  validate={true}
  showValidationOnBlur={true}
  enableHoverDetail={true}
  onFetchHoverDetail={async (id) => await fetchDetail(id)}
/>
```

## Key Hooks

The component uses several custom hooks for state management:

- `useDropdownState`: Manages open/close state
- `useDropdownSearch`: Handles search functionality
- `useDropdownValidation`: Manages validation logic
- `useDropdownPosition`: Calculates menu position
- `useKeyboardNavigation`: Handles keyboard interactions
- `useFocusManagement`: Manages focus behavior
- `useScrollManagement`: Handles scrolling in the menu
- `useDropdownEffects`: Combines hover and effect logic
- `useHoverDetail`: Manages hover detail popups
- `useTextExpansion`: Handles text truncation/expansion

## Constants

Key constants used in the component:

```src/components/dropdown/constants.ts#L1-20
export const DROPDOWN_CONSTANTS = {
  ANIMATION_DURATION: 100,
  CLOSE_TIMEOUT: 200,
  HOVER_TIMEOUT: 100,
  DEBOUNCE_DELAY: 150,
  FOCUS_DELAY: 50,
  SEARCH_FOCUS_DELAY: 5,
  VIEWPORT_MARGIN: 16,
  DROPDOWN_MARGIN: 4,
  DROPDOWN_SPACING: 2,
  MAX_HEIGHT: 240,
  SCROLL_THRESHOLD: 2,
  PAGE_SIZE: 5,
  BUTTON_PADDING: 48,
  RADIO_EXTRA_PADDING: 24,
  PORTAL_Z_INDEX: 1060,
} as const;
```

## Context and Provider

The component uses `DropdownProvider` to share state across sub-components. The context includes:

- Open/close states
- Current values and options
- Search state
- Navigation state
- Validation state
- Event handlers
- Ref objects

## Accessibility

- Full keyboard navigation (Arrow keys, Tab, Enter, Escape)
- ARIA labels and roles
- Focus management and trapping
- Screen reader support
- High contrast support

## Performance Considerations

- Debounced search input
- Virtualized rendering not implemented (consider for large lists > 1000 items)
- Efficient filtering and highlighting
- Animation optimizations with CSS transforms

## Browser Support

Supports all modern browsers including Chrome, Firefox, Safari, and Edge. Uses CSS Grid, Flexbox, and modern JavaScript features.

## Dependencies

- React 16+
- Preline UI (for base styling)
- Custom utility functions for positioning and animations

## Notes

- The component uses a portal for rendering the dropdown menu to avoid z-index issues
- Position calculation accounts for viewport boundaries
- Animation states are managed to prevent layout thrashing
- Validation integrates with form systems through the `name` prop
