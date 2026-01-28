# SlidingSelector Component

## Overview

SlidingSelector is a highly configurable, animated selector component built with React and Framer Motion. It provides a smooth, interactive way to choose between multiple options with fluid animations and flexible styling options.

## Key Features

- **Generic TypeScript Support**: Full type safety with custom value types
- **Multiple Variants**: Tabs and selector modes for different use cases
- **Responsive Design**: Three size variants (sm, md, lg) with consistent styling
- **Shape Options**: Rounded corners or pill-shaped designs
- **Advanced Animations**: Three animation presets with customizable spring physics
- **Collapsible UI**: Auto-collapse functionality with hover expand behavior
- **Layout Animations**: Smooth transitions powered by Framer Motion's layout system
- **Accessibility**: Focus management and keyboard navigation support

## API Reference

### Props Interface

```typescript
interface SlidingSelectorProps<T = unknown> {
  // Core functionality
  options: SlidingSelectorOption<T>[];
  activeKey: string;
  onSelectionChange: (key: string, value: T, event?: React.MouseEvent) => void;

  // Visual configuration
  variant?: 'tabs' | 'selector';
  size?: 'sm' | 'md' | 'lg';
  shape?: 'rounded' | 'pill';

  // Collapsible behavior
  collapsible?: boolean;
  defaultExpanded?: boolean;
  autoCollapseDelay?: number;
  expandOnHover?: boolean;

  // Animation system
  layoutId?: string;
  animationPreset?: 'smooth' | 'snappy' | 'fluid';

  // Additional props
  className?: string;
  disabled?: boolean;
}
```

### Option Interface

```typescript
interface SlidingSelectorOption<T = unknown> {
  key: string; // Unique identifier
  value: T; // Associated value of any type
  defaultLabel: string; // Label when not active
  activeLabel?: string; // Optional label when active
  disabled?: boolean; // Disable specific option
}
```

## Usage Examples

### Basic Usage

```typescript
import { SlidingSelector } from '@/components/shared/SlidingSelector';

const options = [
  { key: 'option1', value: 'value1', defaultLabel: 'Option 1' },
  { key: 'option2', value: 'value2', defaultLabel: 'Option 2' },
  { key: 'option3', value: 'value3', defaultLabel: 'Option 3' },
];

<SlidingSelector
  options={options}
  activeKey="option1"
  onSelectionChange={(key, value) => console.log(key, value)}
/>
```

### Advanced Configuration

```typescript
<SlidingSelector
  options={options}
  activeKey="option2"
  onSelectionChange={handleChange}
  variant="tabs"
  size="lg"
  shape="pill"
  collapsible={true}
  expandOnHover={true}
  autoCollapseDelay={500}
  animationPreset="snappy"
  layoutId="unique-selector"
/>
```

### Generic Type Usage

```typescript
interface UserRole {
  id: number;
  name: string;
  permissions: string[];
}

const roleOptions: SlidingSelectorOption<UserRole>[] = [
  {
    key: 'admin',
    value: { id: 1, name: 'Admin', permissions: ['read', 'write', 'delete'] },
    defaultLabel: 'Admin',
    activeLabel: 'Administrator'
  },
  // ... more options
];

<SlidingSelector<UserRole>
  options={roleOptions}
  activeKey="admin"
  onSelectionChange={(key, role) => {
    // role is properly typed as UserRole
    console.log(role.permissions);
  }}
/>
```

## Configuration Options

### Size Variants

| Size | Container Padding | Button Padding | Text Size   |
| ---- | ----------------- | -------------- | ----------- |
| `sm` | `p-0.5`           | `px-2 py-1`    | `text-sm`   |
| `md` | `p-1`             | `px-3 py-1.5`  | `text-base` |
| `lg` | `p-1.5`           | `px-6 py-3`    | `text-lg`   |

### Animation Presets

| Preset   | Container Spring | Background Spring | Use Case                            |
| -------- | ---------------- | ----------------- | ----------------------------------- |
| `smooth` | 400/30/0.6s      | 500/30/0.3s       | General purpose, polished feel      |
| `snappy` | 600/25/0.4s      | 700/25/0.2s       | Quick interactions, responsive feel |
| `fluid`  | 300/35/0.8s      | 400/35/0.4s       | Gentle animations, relaxed UX       |

### Shape Options

- **`rounded`**: Standard rounded corners (`rounded-lg`)
- **`pill`**: Fully rounded pill shape (`rounded-full`)

## Animation System

### Layout Animations

The component uses Framer Motion's layout animation system:

```typescript
// Unique layout ID for animation tracking
layoutId={`${layoutId || variant}-selector-bg`}

// Spring physics configuration
transition={{
  type: 'spring',
  stiffness: 500,
  damping: 30,
  duration: 0.3
}}
```

### Animation Flow

1. **Layout Changes**: Container expands/collapses smoothly
2. **Background Movement**: Active indicator slides between options
3. **Label Transitions**: Text changes with crossfade effect
4. **Hover Effects**: Smooth color transitions on interaction

## Collapsible Behavior

### Auto-Collapse Logic

When `collapsible={true}` and `expandOnHover={true}`:

1. Component starts in `defaultExpanded` state
2. On mouse enter: Expands immediately
3. On mouse leave: Waits `autoCollapseDelay` milliseconds
4. Collapses to show only active option + expand button

### Manual Toggle

```typescript
// Click expand button to toggle
const toggleExpanded = () => {
  setIsExpanded(prev => !prev);
};
```

## Integration Patterns

### With Form Libraries

```typescript
// React Hook Form integration
const { setValue, watch } = useForm();
const selectedValue = watch('selector');

<SlidingSelector
  options={options}
  activeKey={selectedValue}
  onSelectionChange={(key, value) => setValue('selector', key)}
/>
```

### Multiple Instances

Use unique `layoutId` to prevent animation conflicts:

```typescript
<SlidingSelector
  layoutId="header-selector"
  // ... props
/>

<SlidingSelector
  layoutId="sidebar-selector"
  // ... props
/>
```

### Real-world Usage Examples

The component is used throughout the application:

- **Pagination**: Page size selection with number values
- **Filters**: Category/type selection with string values
- **Settings**: Configuration options with complex object values
- **Navigation**: Tab switching with route information

## Styling Customization

### CSS Classes Applied

```typescript
// Container classes
'flex items-center bg-zinc-100 shadow-md text-slate-700 overflow-hidden select-none relative w-fit';

// Active state background
'absolute inset-0 bg-primary shadow-xs';

// Button hover states
'hover:bg-primary/10 hover:text-primary';
```

### Custom Styling

```typescript
<SlidingSelector
  className="custom-selector-styles"
  // Override default styles with Tailwind classes
/>
```

## Performance Considerations

### Optimizations

- **useCallback**: Event handlers are memoized to prevent unnecessary re-renders
- **Layout Animations**: Efficient GPU-accelerated animations via Framer Motion
- **Conditional Rendering**: Collapsed state reduces DOM complexity
- **Event Delegation**: Minimal event listener attachment

### Best Practices

1. **Stable Keys**: Use consistent, unique keys for options
2. **Layout ID**: Provide unique `layoutId` for multiple instances
3. **Option Memoization**: Memoize options array to prevent recreation
4. **Value Stability**: Keep option values stable between renders

## TypeScript Support

### Fully Typed API

- Generic type parameter for option values
- Strict prop validation with TypeScript interfaces
- IntelliSense support for all configuration options
- Type-safe event handlers with proper value typing

### Type Inference

```typescript
// Type is inferred from options
const stringOptions = [{ key: '1', value: 'text', defaultLabel: 'Text' }];

// No need to explicitly type
<SlidingSelector
  options={stringOptions}  // T inferred as string
  onSelectionChange={(key, value) => {
    // value is automatically typed as string
  }}
/>
```
