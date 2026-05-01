# Pagination Component Technical Architecture

## Overview

The Pagination component is a sophisticated, feature-rich React component that provides both traditional and floating pagination functionality. It implements a modular architecture using React Context API, custom hooks, and well-separated concerns.

## Architecture Patterns

### 1. Context Provider Pattern

The component uses React Context to share state and functionality across all child components, eliminating prop drilling and providing a centralized state management solution.

```typescript
PaginationProvider → PaginationContext → Child Components
```

### 2. Custom Hook Composition

Multiple specialized hooks handle different aspects of pagination:

- `usePaginationState`: Core pagination state management
- `useFloatingPagination`: Floating pagination visibility logic
- `useAnimationDirection`: Animation direction calculation
- `useKeyboardNavigation`: Keyboard interaction handling
- `usePaginationContext`: Context consumer hook

### 3. Component Composition

Modular component design allows for flexible UI composition:

- `PaginationContent`: Main content wrapper
- `FloatingWrapper`: Floating pagination container
- `PageSizeSelector`: Items per page selector
- `PageNavigationControl`: Page navigation surface
- `PaginationButton`: Navigation buttons
- `CurrentPageDisplay`: Current page indicator

## Core Components

### Main Component (`index.tsx`)

The root component that orchestrates all functionality:

```typescript
<PaginationProvider>
  <div> {/* Static pagination */}
    <PaginationContent />
  </div>
  <FloatingWrapper> {/* Floating pagination */}
    <PaginationContent isFloating />
  </FloatingWrapper>
</PaginationProvider>
```

### State Management (`usePaginationState`)

Manages core pagination state including:

- Current page tracking
- Page size management
- Event handler creation
- Page size index synchronization

### Floating Logic (`useFloatingPagination`)

Implements Intersection Observer API to:

- Detect when static pagination is out of view
- Toggle floating pagination visibility
- Handle scroll-based interactions

### Animation System (`useAnimationDirection`)

Calculates animation direction based on page navigation:

- Forward navigation: positive direction
- Backward navigation: negative direction
- Used for smooth page transitions

## Type System

### Core Interfaces

#### `PaginationContextValue`

```typescript
interface PaginationContextValue {
  // State
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  showFloating: boolean;
  selectedPageSizeIndex: number;
  direction: number;

  // Actions
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  handleItemsPerPageClick: (value: number, event: React.MouseEvent) => void;

  // Configuration
  enableFloating: boolean;
  hideFloatingWhenModalOpen: boolean;
  className?: string;
  pageSizes: number[];
}
```

#### `FloatingPaginationProps`

Main component props interface with configuration options for floating behavior, styling, and event handlers.

## Configuration System

### Constants (`constants.ts`)

Centralized configuration for:

- **Animation**: Spring physics, timing, and transition values
- **Floating**: Intersection Observer settings, positioning
- **Page Sizes**: Available items per page options `[25, 50, 100, -1]`
- **Styling**: Backdrop filters, colors, dimensions
- **Accessibility**: ARIA labels for screen readers

### Utility Functions (`paginationUtils.ts`)

Mathematical helpers for pagination calculations:

```typescript
-calculateTotalPages(totalItems, itemsPerPage) -
  calculateItemRange(currentPage, itemsPerPage) -
  isValidPage(page, totalPages) -
  clampPage(page, totalPages) -
  calculateOffset(currentPage, itemsPerPage);
```

## Component Dependencies

### Page Size Selector

#### Architecture Relationship

```typescript
PaginationContent → PageSizeSelector
PaginationContent → PageNavigationControl
```

#### Implementation Details

- **Pagination-owned UI**: `PageSizeSelector` implements its own pill expand/collapse behavior instead of sharing tab navigation components
- **Separate Controls**: `PageSizeSelector` and `PageNavigationControl` each consume pagination context directly
- **Interaction Model**: Desktop expands on hover and collapses on mouse leave; touch devices expand/collapse by click
- **Label Mapping**:
  ```typescript
  // pageSizes: [25, 50, 100, -1]
  {
    value: 25,
    defaultLabel: "25",
    activeLabel: "25 items"
  }
  ```

#### Shared Features Utilized

- **Pagination State**: Uses the pagination context's `itemsPerPage` and page-size callback
- **Surface Styling**: Uses the shared white surface and `shadow-thin` token

#### Benefits of Separation

- **Clear Ownership**: Pagination behavior is not coupled to tab/navigation behavior
- **Safer Iteration**: Page-size animation changes do not affect item-master tabs
- **Focused UX**: Pagination can use hover/touch rules specific to compact controls

## Features

### Dual-Mode Operation

- **Static Mode**: Traditional pagination at bottom of content
- **Floating Mode**: Sticky pagination that appears when static version scrolls out of view

### Keyboard Navigation

Full keyboard support with arrow keys, Enter, and Escape handling for accessibility compliance.

### Animation System

Smooth page transitions using spring physics with configurable stiffness and damping values.

### Responsive Design

Adapts to different screen sizes with optimized floating positioning and mobile-friendly interactions.

### Accessibility

- ARIA labels for screen readers
- Keyboard navigation support
- Focus management
- High contrast support

## Data Flow

1. **Props → State**: Component receives pagination props and initializes internal state
2. **State → Context**: State is provided to all child components via Context
3. **User Interaction → Handlers**: User actions trigger event handlers
4. **Handlers → Callbacks**: Event handlers call parent component callbacks
5. **Callbacks → Re-render**: Parent updates props, triggering component re-render

## Performance Optimizations

- **Memoized Calculations**: Page sizes and derived values are memoized
- **Event Handler Stability**: useCallback prevents unnecessary re-renders
- **Intersection Observer**: Efficient scroll detection for floating behavior
- **Conditional Rendering**: Floating component only renders when enabled
