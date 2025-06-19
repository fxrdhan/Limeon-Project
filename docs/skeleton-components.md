# Skeleton Loading Components

This documentation explains how to use the skeleton loading components in the PharmaSys application to provide better user experience during data loading states.

## Overview

Skeleton components provide placeholder UI elements that mimic the structure of the actual content while data is being fetched. This prevents users from seeing blank screens and gives them a sense of progress.

## Basic Skeleton Components

### `Skeleton`
The base skeleton component for creating simple placeholder elements.

```tsx
import { Skeleton } from "@/components/skeleton";

// Basic usage
<Skeleton className="h-4 w-32" />

// With custom width and height
<Skeleton width="80%" height="20px" />
```

### `SkeletonText`
For creating text-like placeholders with multiple lines.

```tsx
import { SkeletonText } from "@/components/skeleton";

// Single line
<SkeletonText />

// Multiple lines
<SkeletonText lines={3} />
```

### `CardSkeleton`
For loading states of card components.

```tsx
import { CardSkeleton } from "@/components/skeleton";

// Basic card skeleton
<CardSkeleton />

// Without header
<CardSkeleton showHeader={false} />

// Custom content lines
<CardSkeleton contentLines={5} />
```

### `StatCardSkeleton`
Specifically designed for dashboard statistics cards.

```tsx
import { StatCardSkeleton } from "@/components/skeleton";

<StatCardSkeleton />
```

### `FormSkeleton`
For form loading states.

```tsx
import { FormSkeleton } from "@/components/skeleton";

// Basic form with 6 fields
<FormSkeleton />

// Custom number of fields
<FormSkeleton fields={4} />

// Without action buttons
<FormSkeleton showButtons={false} />
```

## Table Skeleton Components

### Pre-configured Table Skeletons

The application includes pre-configured skeleton tables for common data types:

#### `ItemListSkeleton`
```tsx
import { ItemListSkeleton } from "@/components/table";

<ItemListSkeleton rows={8} />
```

#### `CategoryListSkeleton`
```tsx
import { CategoryListSkeleton } from "@/components/table";

<CategoryListSkeleton rows={8} />
```

#### `UnitListSkeleton`
```tsx
import { UnitListSkeleton } from "@/components/table";

<UnitListSkeleton rows={8} />
```

#### `TypeListSkeleton`
```tsx
import { TypeListSkeleton } from "@/components/table";

<TypeListSkeleton rows={8} />
```

#### `SupplierListSkeleton`
```tsx
import { SupplierListSkeleton } from "@/components/table";

<SupplierListSkeleton rows={8} />
```

#### `PatientListSkeleton`
```tsx
import { PatientListSkeleton } from "@/components/table";

<PatientListSkeleton rows={8} />
```

#### `PurchaseListSkeleton`
```tsx
import { PurchaseListSkeleton } from "@/components/table";

<PurchaseListSkeleton rows={8} />
```

### Custom Table Skeletons

For custom table structures, use the `SkeletonTable` component:

```tsx
import { SkeletonTable } from "@/components/table";

const headers = [
  { title: "Name", className: "w-[30%]" },
  { title: "Email", className: "w-[40%]" },
  { title: "Status", className: "w-[30%]" },
];

const columns = [
  { width: "85%", className: "" },
  { width: "90%", className: "" },
  { width: "60%", className: "text-center" },
];

<SkeletonTable 
  headers={headers}
  columns={columns}
  rows={10}
/>
```

## Page Loading Fallbacks

### `TableLoadingFallback`
Complete page skeleton for table-based pages.

```tsx
import { TableLoadingFallback } from "@/components/loading-fallback";

<TableLoadingFallback
  title="Daftar Items"
  tableColumns={10}
  tableRows={8}
  showSearchBar={true}
  showButton={true}
  showPagination={true}
/>
```

### `DashboardLoadingFallback`
Skeleton for dashboard pages.

```tsx
import { DashboardLoadingFallback } from "@/components/loading-fallback";

<DashboardLoadingFallback />
```

### `FormLoadingFallback`
Skeleton for form pages.

```tsx
import { FormLoadingFallback } from "@/components/loading-fallback";

<FormLoadingFallback />
```

## Implementation Patterns

### In List Pages

Replace simple loading messages with skeleton tables:

```tsx
// Before
{isLoading && items.length === 0 ? (
  <TableRow>
    <TableCell colSpan={10} className="text-center text-gray-500 py-10">
      Memuat data item...
    </TableCell>
  </TableRow>
) : (
  // Render actual data
)}

// After
{isLoading && items.length === 0 ? (
  <ItemListSkeleton rows={8} />
) : (
  <Table>
    {/* Render actual table */}
  </Table>
)}
```

### In React.Suspense

Use loading fallbacks for better page transitions:

```tsx
// Before
<Suspense>
  <ItemList />
</Suspense>

// After
<Suspense
  fallback={
    <TableLoadingFallback
      title="Daftar Item"
      tableColumns={10}
    />
  }
>
  <ItemList />
</Suspense>
```

### In Custom Components

Create component-specific skeletons:

```tsx
const MyComponentSkeleton = () => (
  <div className="space-y-4">
    <SkeletonText lines={2} />
    <div className="grid grid-cols-2 gap-4">
      <CardSkeleton />
      <CardSkeleton />
    </div>
  </div>
);

// Use in your component
{isLoading ? <MyComponentSkeleton /> : <ActualContent />}
```

## Best Practices

1. **Match the Structure**: Skeleton components should closely match the structure of the actual content.

2. **Consistent Timing**: Use skeletons for loading states that take more than 200ms.

3. **Progressive Loading**: Show skeletons immediately, don't wait for data fetching to start.

4. **Responsive Design**: Ensure skeleton components work well on all screen sizes.

5. **Accessibility**: Skeleton components include proper ARIA attributes for screen readers.

6. **Performance**: Skeleton components are lightweight and don't impact page performance.

## Customization

### Custom Animations

You can customize the pulse animation by modifying the CSS:

```css
.custom-skeleton {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: .5;
  }
}
```

### Custom Colors

Override the default skeleton colors using Tailwind classes:

```tsx
<Skeleton className="bg-blue-200" />
```

### Custom Shapes

Create skeletons for specific UI elements:

```tsx
// Circular skeleton (for avatars)
<Skeleton className="h-12 w-12 rounded-full" />

// Rounded rectangle (for buttons)
<Skeleton className="h-10 w-24 rounded-lg" />
```

## Migration Guide

To migrate from simple loading messages to skeleton components:

1. Identify loading states in your components
2. Replace loading messages with appropriate skeleton components
3. Update Suspense fallbacks to use loading fallback components
4. Test the loading experience across different connection speeds

## Troubleshooting

### Skeleton Not Showing
- Ensure the loading state is properly managed
- Check that the skeleton component is rendered when `isLoading` is true
- Verify that CSS classes are properly applied

### Layout Shifts
- Make sure skeleton dimensions match the actual content
- Use consistent spacing and margins
- Test with different content lengths

### Performance Issues
- Avoid rendering too many skeleton elements simultaneously
- Use appropriate `rows` props for table skeletons
- Consider lazy loading for very long lists