# Checkbox Component

A flexible, accessible React checkbox component with animation support and keyboard navigation.

## Features

- **Smooth Animation**: Framer Motion powered check mark animation
- **Keyboard Navigation**: Full Enter key support for accessibility
- **Disabled State**: Visual and functional disabled state handling
- **Custom Styling**: Flexible className support for customization
- **TypeScript**: Full type safety with organized interfaces
- **Accessibility**: Proper ARIA labels and keyboard navigation
- **Ref Support**: Forward ref for imperative access

## Basic Usage

```tsx
import Checkbox from '@/components/checkbox';

const MyComponent = () => {
  const [isChecked, setIsChecked] = useState(false);

  return (
    <Checkbox
      id="my-checkbox"
      label="Accept terms and conditions"
      checked={isChecked}
      onChange={setIsChecked}
    />
  );
};
```

## Props API

### Required Props

| Prop       | Type                         | Description                 |
| ---------- | ---------------------------- | --------------------------- |
| `checked`  | `boolean`                    | Whether checkbox is checked |
| `onChange` | `(checked: boolean) => void` | Handler for state changes   |

### Optional Props

| Prop        | Type      | Default     | Description                                 |
| ----------- | --------- | ----------- | ------------------------------------------- |
| `id`        | `string`  | `undefined` | HTML id attribute for the input             |
| `label`     | `string`  | `undefined` | Label text displayed next to checkbox       |
| `disabled`  | `boolean` | `false`     | Disable interaction and show disabled state |
| `className` | `string`  | `''`        | Additional CSS classes for the container    |
| `tabIndex`  | `number`  | `undefined` | Tab order for keyboard navigation           |

## Advanced Examples

### With Custom Styling

```tsx
<Checkbox
  id="styled-checkbox"
  label="Custom styled checkbox"
  checked={isChecked}
  onChange={setIsChecked}
  className="my-4 text-lg"
/>
```

### Disabled State

```tsx
<Checkbox
  id="disabled-checkbox"
  label="This checkbox is disabled"
  checked={true}
  onChange={() => {}} // No-op since it's disabled
  disabled={true}
/>
```

### Without Label

```tsx
<Checkbox id="no-label-checkbox" checked={isChecked} onChange={setIsChecked} />
```

### With Ref

```tsx
const checkboxRef = useRef<HTMLLabelElement>(null);

<Checkbox
  ref={checkboxRef}
  id="ref-checkbox"
  label="Checkbox with ref"
  checked={isChecked}
  onChange={setIsChecked}
/>;
```

## Keyboard Navigation

| Key     | Action                     |
| ------- | -------------------------- |
| `Enter` | Toggle checkbox state      |
| `Tab`   | Move focus to next element |

## Architecture

### Component Structure

```
checkbox/
├── index.tsx                    # Main component orchestrator
├── types/                       # TypeScript interfaces
│   ├── components.ts           # Component prop interfaces
│   └── index.ts                # Type exports
├── components/                  # UI Components
│   ├── CheckboxInput.tsx       # Hidden native input
│   ├── CheckboxIcon.tsx        # Animated check icon
│   ├── CheckboxLabel.tsx       # Text label component
│   └── index.ts                # Component exports
├── hooks/                       # Custom hooks
│   ├── useKeyboardHandler.ts   # Keyboard event handling
│   └── index.ts                # Hook exports
└── utils/                       # Utility functions
    ├── checkboxStyles.ts       # Styling helper functions
    └── index.ts                # Utility exports
```

### Design Patterns

**Single Responsibility Principle**: Each component has one clear purpose

```tsx
// Input handling
<CheckboxInput id={id} checked={checked} onChange={onChange} disabled={disabled} />

// Visual representation
<CheckboxIcon checked={checked} disabled={disabled} />

// Label display
<CheckboxLabel label={label} />
```

**Custom Hooks**: Encapsulates keyboard interaction logic

```tsx
// Keyboard event handling
const { handleKeyDown } = useKeyboardHandler({
  disabled,
  onChange,
  checked,
});
```

**Utility Functions**: Centralizes styling logic

```tsx
// Consistent styling application
const containerStyles = getContainerStyles(disabled, className);
```

## Animation

The checkbox uses Framer Motion for smooth check mark animations:

```tsx
// Animation configuration
<motion.div
  initial={{ scale: 0.5, opacity: 0 }}
  animate={{ scale: 1, opacity: 1 }}
  exit={{ scale: 0.5, opacity: 0 }}
  transition={{ duration: 0.1, ease: 'circOut' }}
>
  <FaCheck className="text-white" />
</motion.div>
```

## Accessibility

- **ARIA Compliance**: Proper label association with `htmlFor` attribute
- **Keyboard Navigation**: Enter key support for activation
- **Screen Reader Support**: Hidden native input maintains accessibility
- **Focus Management**: Clear focus indicators and logical tab order
- **Disabled State**: Proper `aria-disabled` handling

## Performance

- **Optimized Callbacks**: Uses `useCallback` to prevent unnecessary re-renders
- **Minimal DOM**: Lightweight structure with hidden native input
- **Efficient Animation**: Short duration animations (0.1s) for responsiveness
- **Conditional Rendering**: Label only renders when provided

## Customization

### Styling

The component uses Tailwind CSS classes that can be customized:

```tsx
// Container styling
className = 'inline-flex items-center group focus:outline-hidden';

// Icon styling
className = 'relative w-5 h-5 border-2 rounded-md';

// Label styling
className = 'text-sm text-slate-700 select-none';
```

### Icon Customization

Replace the check icon by modifying the `CheckboxIcon` component:

```tsx
// Use a different icon
import { FiCheck } from 'react-icons/fi';

<FiCheck className="text-white" />;
```

### Animation Customization

Modify animation properties in `CheckboxIcon.tsx`:

```tsx
// Custom animation timing
transition={{ duration: 0.2, ease: 'easeInOut' }}

// Custom animation states
initial={{ scale: 0, rotate: -180 }}
animate={{ scale: 1, rotate: 0 }}
```

## Contributing

When modifying the component:

1. Maintain single responsibility for each sub-component
2. Update TypeScript interfaces in `types/` folder
3. Keep animations lightweight and accessible
4. Follow existing naming conventions
5. Update this documentation for API changes
6. Test keyboard navigation and screen reader compatibility
