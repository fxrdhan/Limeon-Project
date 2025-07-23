# Pagination Component

A modern, accessible React pagination component with floating behavior, smooth animations, and keyboard navigation support.

## Features

- **Floating Pagination**: Automatically appears when main pagination is out of view
- **Smooth Animations**: Framer Motion powered transitions for page changes
- **Page Size Selection**: Dynamic items per page with animated selector
- **Keyboard Navigation**: Full arrow key support for floating mode
- **Modal-Aware**: Auto-hide floating pagination when modals are open
- **Accessibility**: ARIA labels and keyboard navigation support
- **TypeScript**: Full type safety with organized interfaces
- **Responsive**: Works seamlessly on desktop and mobile devices
- **Context Pattern**: Eliminates prop drilling with React Context

## Basic Usage

```tsx
import Pagination from '@/components/pagination';

const MyComponent = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(parseInt(e.target.value));
    setCurrentPage(1); // Reset to first page
  };

  return (
    <Pagination
      currentPage={currentPage}
      totalPages={Math.ceil(totalItems / itemsPerPage)}
      totalItems={totalItems}
      itemsPerPage={itemsPerPage}
      itemsCount={data.length}
      onPageChange={handlePageChange}
      onItemsPerPageChange={handleItemsPerPageChange}
    />
  );
};
```

## Props API

### Required Props

| Prop | Type | Description |
|------|------|-------------|
| `currentPage` | `number` | Current active page number (1-based) |
| `totalPages` | `number` | Total number of pages available |
| `totalItems` | `number` | Total number of items across all pages |
| `itemsPerPage` | `number` | Number of items displayed per page |
| `itemsCount` | `number` | Number of items in current page |
| `onPageChange` | `(page: number) => void` | Handler for page navigation |
| `onItemsPerPageChange` | `(e: React.ChangeEvent<HTMLSelectElement>) => void` | Handler for page size changes |

### Optional Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | `undefined` | CSS classes for the main container |
| `enableFloating` | `boolean` | `true` | Enable floating pagination behavior |
| `hideFloatingWhenModalOpen` | `boolean` | `false` | Hide floating pagination when modals are open |

## Advanced Examples

### With Modal Integration

```tsx
const [isModalOpen, setIsModalOpen] = useState(false);

<Pagination
  currentPage={currentPage}
  totalPages={totalPages}
  totalItems={totalItems}
  itemsPerPage={itemsPerPage}
  itemsCount={data.length}
  onPageChange={handlePageChange}
  onItemsPerPageChange={handleItemsPerPageChange}
  hideFloatingWhenModalOpen={isModalOpen}
/>
```

### Disabled Floating Behavior

```tsx
<Pagination
  currentPage={currentPage}
  totalPages={totalPages}
  totalItems={totalItems}
  itemsPerPage={itemsPerPage}
  itemsCount={data.length}
  onPageChange={handlePageChange}
  onItemsPerPageChange={handleItemsPerPageChange}
  enableFloating={false}
/>
```

### Custom Styling

```tsx
<Pagination
  currentPage={currentPage}
  totalPages={totalPages}
  totalItems={totalItems}
  itemsPerPage={itemsPerPage}
  itemsCount={data.length}
  onPageChange={handlePageChange}
  onItemsPerPageChange={handleItemsPerPageChange}
  className="my-custom-pagination-class"
/>
```

### Server-Side Pagination

```tsx
const MyServerPaginatedTable = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const { data, totalItems } = useQuery(['items', currentPage, itemsPerPage],
    () => fetchItems({ page: currentPage, limit: itemsPerPage })
  );

  return (
    <>
      <DataTable data={data} />
      <Pagination
        currentPage={currentPage}
        totalPages={Math.ceil(totalItems / itemsPerPage)}
        totalItems={totalItems}
        itemsPerPage={itemsPerPage}
        itemsCount={data?.length || 0}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={(e) => {
          setItemsPerPage(parseInt(e.target.value));
          setCurrentPage(1);
        }}
      />
    </>
  );
};
```

## Keyboard Navigation

When floating pagination is active, these keyboard shortcuts are available:

| Key | Action |
|-----|--------|
| `ArrowLeft` | Navigate to previous page |
| `ArrowRight` | Navigate to next page |
| `ArrowUp` | Increase page size (cycles through options) |
| `ArrowDown` | Decrease page size (cycles through options) |

## Architecture

### Component Structure

```
pagination/
├── index.tsx                    # Main component orchestrator
├── constants.ts                 # Configuration constants
├── types/                       # TypeScript interfaces
│   ├── context.ts              # Context type definitions
│   ├── hooks.ts                # Hook parameter interfaces
│   ├── components.ts           # Component prop interfaces
│   └── index.ts                # Type exports
├── providers/                   # React Context
│   ├── PaginationContext.tsx   # Context provider component
│   └── paginationContext.ts    # Context definition
├── components/                    # UI Components
│   ├── PaginationButton.tsx    # Previous/Next buttons
│   ├── PageSizeSelector.tsx    # Page size selector
│   ├── CurrentPageDisplay.tsx  # Current page indicator
│   ├── PaginationContent.tsx   # Main content container
│   ├── FloatingWrapper.tsx     # Floating behavior wrapper
│   └── index.ts                # Component exports
├── hooks/                       # Custom hooks
│   ├── usePaginationState.ts   # Core pagination state
│   ├── useFloatingPagination.ts# Floating behavior logic
│   ├── useKeyboardNavigation.ts# Keyboard navigation
│   ├── useAnimationDirection.ts# Animation direction logic
│   ├── usePaginationContext.ts # Context access hook
│   └── index.ts                # Hook exports
└── utils/                       # Utility functions
    ├── paginationUtils.ts      # Helper functions
    └── index.ts                # Utility exports
```

### Design Patterns

**Context Pattern**: Eliminates prop drilling by sharing state through React Context

```tsx
// Components access shared state via context
const { currentPage, totalPages, onPageChange } = usePaginationContext();
```

**Custom Hooks**: Encapsulates complex logic into reusable, testable units

```tsx
// State management
const paginationState = usePaginationState({ currentPage, totalPages, ... });

// Floating behavior
const { showFloating } = useFloatingPagination({ enableFloating, containerRef });

// Keyboard navigation
useKeyboardNavigation({ showFloating, currentPage, totalPages, ... });
```

**Atomic Design**: Components are broken down into focused, single-responsibility units

```tsx
// Composed from smaller components
<PaginationContent>
  <PageSizeSelector />
  <PaginationButton direction="prev" />
  <CurrentPageDisplay />
  <PaginationButton direction="next" />
</PaginationContent>
```

**Intersection Observer**: Efficient floating pagination trigger

```tsx
// Automatically shows/hides floating pagination based on visibility
const observer = new IntersectionObserver(([entry]) => {
  setShowFloating(!entry.isIntersecting);
});
```

## Page Size Options

The component supports these page size options by default:
- 10 items per page
- 20 items per page
- 50 items per page
- 100 items per page

These can be customized by modifying the `PAGE_SIZES` constant in `constants.ts`.

## Animations

### Page Number Transitions
- **Direction-aware**: Page numbers slide left/right based on navigation direction
- **Spring Physics**: Smooth, natural feeling transitions using Framer Motion
- **Optimized**: Uses `AnimatePresence` with `popLayout` mode for better performance

### Floating Pagination
- **Scale & Translate**: Appears from bottom with scale and Y-axis animation
- **Backdrop Blur**: Glass-morphism effect with backdrop filter
- **Portal Rendering**: Rendered outside normal DOM flow for proper z-indexing

### Page Size Selector
- **Layout Animations**: Smooth background transition using `layoutId`
- **Hover States**: Subtle hover effects with emerald color scheme
- **Active Indication**: Clear visual feedback for selected page size

## Accessibility

- **ARIA Labels**: Proper labeling for screen readers
  - Previous page button: "Halaman sebelumnya"
  - Next page button: "Halaman berikutnya"
- **Keyboard Navigation**: Full keyboard support in floating mode
- **Focus Management**: Logical focus flow through interactive elements
- **Screen Reader Support**: Announces page changes and state updates
- **Semantic HTML**: Uses appropriate button elements with proper roles

## Performance

- **Intersection Observer**: Efficient viewport detection for floating behavior
- **Context Optimization**: Minimizes unnecessary re-renders through careful context structure
- **Memoization**: Strategic use of React.memo and useCallback in custom hooks
- **Portal Rendering**: Floating pagination rendered efficiently outside main tree
- **Animation Optimization**: Uses hardware acceleration and will-change for smooth animations

## Utility Functions

The component includes utility functions for common pagination calculations:

```tsx
import { paginationUtils } from '@/components/pagination/utils';

// Calculate total pages
const totalPages = paginationUtils.calculateTotalPages(totalItems, itemsPerPage);

// Calculate item range for current page
const { start, end } = paginationUtils.calculateItemRange(currentPage, itemsPerPage);

// Validate page number
const isValid = paginationUtils.isValidPage(page, totalPages);

// Calculate database offset
const offset = paginationUtils.calculateOffset(currentPage, itemsPerPage);
```

## Customization

### Constants

Modify behavior through constants:

```tsx
// constants.ts
export const PAGINATION_CONSTANTS = {
  PAGE_SIZES: [10, 20, 50, 100], // Available page sizes
  ANIMATION: {
    SPRING_STIFFNESS: 500,
    SPRING_DAMPING: 30,
    DURATION: 0.3,
  },
  FLOATING: {
    THRESHOLD: 0.5,
    Z_INDEX: 9998,
  },
};
```

### Styling

The component uses Tailwind CSS classes that can be customized:

```css
/* Override default styles */
.pagination-container {
  @apply your-custom-classes;
}

.pagination-floating {
  background: your-custom-gradient;
  backdrop-filter: blur(8px);
}
```

## Contributing

When modifying the component:

1. **Maintain SRP**: Keep single responsibility principle in each file
2. **Update Types**: Update TypeScript interfaces in `types/` folder
3. **Test Hooks**: Write unit tests for custom hooks
4. **Follow Patterns**: Use existing naming conventions and patterns
5. **Document Changes**: Update this README for API changes
6. **Performance**: Consider performance implications of new features
7. **Accessibility**: Ensure new features maintain accessibility standards
