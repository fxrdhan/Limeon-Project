# Dropdown Component - Technical Architecture

## Overview

This dropdown component implements a modular architecture following Single Responsibility Principle (SRP) with TypeScript interfaces organized in a dedicated types system. The component uses React Context pattern to eliminate prop drilling and custom hooks for focused state management.

## Architecture Philosophy

### Single Responsibility Principle
Every component and hook has exactly one responsibility:
- UI rendering components handle only visual presentation
- Logic hooks manage only specific state or behavior
- Context providers handle only state distribution
- Type definitions are centralized for maintainability

### Context Pattern Implementation
The component uses React Context to share state between components, eliminating the need to pass props through multiple component layers. This reduces component coupling and improves maintainability.

## File Structure

```
dropdown/
├── index.tsx                    # Main dropdown orchestrator with context provider
├── constants.ts                 # Configuration constants and enums
├── README.md                    # Technical documentation
│
├── types/                       # TypeScript interface definitions
│   ├── index.ts                 # Central type exports
│   ├── context.ts               # DropdownContextType interface
│   ├── hooks.ts                 # Hook parameter interfaces
│   └── components.ts            # Component prop interfaces
│
├── providers/                   # Context implementation
│   ├── DropdownContext.tsx      # Context provider component
│   └── dropdownContext.ts       # Context definition
│
├── components/
│   ├── DropdownButton.tsx       # Button orchestrator
│   ├── DropdownMenu.tsx         # Menu orchestrator (uses context)
│   ├── SearchBar.tsx            # Search orchestrator (uses context)
│   ├── OptionItem.tsx           # Option orchestrator (uses context)
│   │
│   ├── button/                  # Atomic button components
│   │   ├── Button.tsx           # Pure button UI
│   │   ├── ButtonText.tsx       # Text display logic
│   │   └── ButtonIcon.tsx       # Icon display logic
│   │
│   ├── search/                  # Atomic search components
│   │   ├── SearchInput.tsx      # Pure input field
│   │   ├── SearchIcon.tsx       # Icon state management
│   │   └── AddNewButton.tsx     # Add functionality
│   │
│   ├── menu/                    # Atomic menu components
│   │   ├── MenuPortal.tsx       # Portal creation
│   │   ├── MenuContent.tsx      # Content wrapper
│   │   ├── ScrollIndicators.tsx # Scroll visualization
│   │   └── EmptyState.tsx       # Empty state display
│   │
│   └── options/                 # Atomic option components
│       ├── OptionContainer.tsx  # Option wrapper and events
│       ├── OptionText.tsx       # Text rendering
│       └── RadioIndicator.tsx   # Radio button display
│
├── hooks/                       # Custom hooks for state management
│   ├── useDropdownState.ts      # Open/close state management
│   ├── useDropdownValidation.ts # Form validation logic
│   ├── useDropdownPosition.ts   # Positioning calculations
│   ├── useDropdownHover.ts      # Hover interaction handling
│   ├── useScrollState.ts        # Scroll position tracking
│   ├── useTextExpansion.ts      # Text expansion logic
│   ├── useDropdownContext.ts    # Context hook with type safety
│   ├── useDropdownEffects.ts    # Grouped effect management
│   ├── useFocusManagement.ts    # Focus-related effects
│   ├── useScrollManagement.ts   # Scroll-related effects
│   │
│   ├── button/                  # Button-specific hooks
│   │   ├── useButtonText.ts     # Text display logic
│   │   └── useButtonExpansion.ts# Expansion behavior
│   │
│   ├── search/                  # Search-specific hooks
│   │   ├── useSearch.ts         # Search state management
│   │   └── useOptionsFilter.ts  # Options filtering logic
│   │
│   └── keyboard/                # Keyboard navigation hooks
│       ├── useKeyboardEvents.ts # Event handling
│       └── useNavigationState.ts# Navigation state management
│
└── utils/                       # Pure utility functions
    └── dropdownUtils.ts         # Helper functions for filtering and styling
```

## Type System Architecture

### Centralized Type Management
All TypeScript interfaces are organized in the `types/` folder for better maintainability:

```typescript
// types/context.ts - Context interface
export interface DropdownContextType {
  // State properties
  isOpen: boolean;
  isClosing: boolean;
  value?: string;
  // ... other context properties
}

// types/hooks.ts - Hook parameter interfaces  
export interface UseDropdownEffectsProps {
  isOpen: boolean;
  applyOpenStyles: boolean;
  // ... other effect parameters
}

// types/components.ts - Component prop interfaces
export interface DropdownMenuProps {
  leaveTimeoutRef: RefObject<NodeJS.Timeout | null>;
  onSearchKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

// types/index.ts - Central exports
export type { DropdownContextType } from './context';
export type { UseDropdownEffectsProps } from './hooks';
export type { DropdownMenuProps } from './components';
```

## Context Pattern Implementation

### DropdownContext Structure
The context provides centralized state management eliminating prop drilling:

```typescript
// Context provides access to:
interface DropdownContextType {
  // State
  isOpen: boolean;
  isClosing: boolean;
  applyOpenStyles: boolean;
  value?: string;
  withRadio?: boolean;
  searchList: boolean;
  
  // Search state
  searchTerm: string;
  searchState: string;
  filteredOptions: Array<{ id: string; name: string }>;
  
  // Navigation state
  highlightedIndex: number;
  isKeyboardNavigation: boolean;
  expandedId: string | null;
  
  // Handlers
  onSelect: (optionId: string) => void;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => void;
  // ... other handlers
}
```

### Context Usage in Components
Components access context through the custom hook:

```typescript
// In any child component
const {
  isOpen,
  searchTerm,
  filteredOptions,
  onSelect,
  onSearchChange
} = useDropdownContext();
```

## Custom Hooks Architecture

### Effect Management Hooks
Complex effects are grouped into focused hooks for better organization:

#### useDropdownEffects
Manages main dropdown lifecycle effects:
```typescript
useDropdownEffects({
  isOpen,
  applyOpenStyles,
  filteredOptions,
  value,
  setApplyOpenStyles,
  setHighlightedIndex,
  setExpandedId,
  calculateDropdownPosition,
  manageFocusOnOpen,
  handleFocusOut,
  // ... other effect dependencies
});
```

#### useFocusManagement
Handles focus-related behavior:
```typescript
const { manageFocusOnOpen, handleFocusOut } = useFocusManagement({
  isOpen,
  searchList,
  touched,
  setTouched,
  actualCloseDropdown,
  dropdownRef,
  dropdownMenuRef,
  searchInputRef,
  optionsContainerRef,
});
```

#### useScrollManagement
Manages scroll-related effects:
```typescript
useScrollManagement({
  isOpen,
  applyOpenStyles,
  filteredOptions,
  highlightedIndex,
  checkScroll,
  scrollToHighlightedOption,
  optionsContainerRef,
});
```

### State Management Hooks
Core hooks manage specific aspects of dropdown state:

```typescript
// Open/close state with global singleton management
const { isOpen, isClosing, openThisDropdown, actualCloseDropdown } = useDropdownState();

// Search functionality with debouncing
const { searchTerm, searchState, handleSearchChange, resetSearch } = useSearch();

// Options filtering with search state updates
const { filteredOptions } = useOptionsFilter({
  options,
  debouncedSearchTerm,
  searchList,
  updateSearchState,
});

// Keyboard navigation with highlight management
const { highlightedIndex, handleNavigate, handleEscape } = useNavigationState({
  isOpen,
  currentFilteredOptions: filteredOptions,
  setExpandedId,
  optionsContainerRef,
});
```

## Component Architecture

### Main Orchestrator
The main dropdown component coordinates all hooks and provides context:

```typescript
const Dropdown = (props: DropdownProps) => {
  // Initialize all hooks
  const dropdownState = useDropdownState();
  const searchState = useSearch();
  const filteredOptions = useOptionsFilter(/* ... */);
  
  // Create context value
  const contextValue = {
    ...dropdownState,
    ...searchState,
    filteredOptions,
    // ... other state and handlers
  };
  
  return (
    <DropdownProvider value={contextValue}>
      <DropdownButton />
      <DropdownMenu />
    </DropdownProvider>
  );
};
```

### Context-Aware Components
Components access shared state through context:

```typescript
// DropdownMenu.tsx - Reduced from 44 props to 3
const DropdownMenu = forwardRef<HTMLDivElement, DropdownMenuProps>(
  ({ leaveTimeoutRef, onSearchKeyDown }, ref) => {
    const {
      isOpen,
      searchList,
      filteredOptions,
      onMenuEnter,
      onMenuLeave,
      // ... access all needed state from context
    } = useDropdownContext();
    
    return (
      <MenuPortal isOpen={isOpen}>
        <SearchBar />
        <MenuContent>
          {filteredOptions.map(option => (
            <OptionItem key={option.id} option={option} />
          ))}
        </MenuContent>
      </MenuPortal>
    );
  }
);
```

## Performance Optimizations

### Prop Drilling Elimination
- DropdownMenu: Reduced from 44 props to 3 props (93% reduction)
- SearchBar: Reduced from 11 props to 3 props
- OptionItem: Reduced from 12 props to 7 props

### Effect Optimization
- Grouped related effects in custom hooks
- Reduced main component from 430 lines to 200 lines
- Improved separation of concerns

### Type Safety
- Centralized type definitions prevent type inconsistencies
- Context hook provides full type safety
- Interface inheritance reduces type duplication

## Usage Examples

### Basic Implementation
```typescript
<Dropdown
  options={[
    { id: '1', name: 'Option 1' },
    { id: '2', name: 'Option 2' },
  ]}
  value={selectedValue}
  onChange={handleChange}
  placeholder="Select an option"
/>
```

### Advanced Configuration
```typescript
<Dropdown
  options={options}
  value={selectedValue}
  onChange={handleChange}
  searchList={true}
  withRadio={true}
  onAddNew={handleAddNew}
  required={true}
  validate={true}
  hoverToOpen={true}
/>
```

## Configuration Constants

All configuration is centralized in constants.ts:

```typescript
export const DROPDOWN_CONSTANTS = {
  ANIMATION_DURATION: 100,
  DEBOUNCE_DELAY: 150,
  MAX_HEIGHT: 240,
  BUTTON_PADDING: 48,
  VIEWPORT_MARGIN: 16,
};

export const SEARCH_STATES = {
  IDLE: 'idle',
  TYPING: 'typing',
  FOUND: 'found',
  NOT_FOUND: 'not-found',
};

export const KEYBOARD_KEYS = {
  ARROW_DOWN: 'ArrowDown',
  ARROW_UP: 'ArrowUp',
  ENTER: 'Enter',
  ESCAPE: 'Escape',
};
```

## Architecture Benefits

### Maintainability
- Single Responsibility: Each file has one clear purpose
- Type Safety: Centralized type definitions prevent inconsistencies
- Context Pattern: Eliminates prop drilling complexity

### Performance
- Reduced re-renders through optimized context usage
- Grouped effects reduce useEffect complexity
- Tree-shakable component architecture

### Developer Experience
- Clear separation of concerns
- Self-documenting code structure
- Easy to test individual components and hooks
- Minimal cognitive overhead for new developers

### Scalability
- Easy to add new features without breaking existing code
- Modular architecture supports incremental changes
- Type system catches errors at compile time