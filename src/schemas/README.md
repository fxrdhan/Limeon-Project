# Schemas Directory

This directory contains all Zod validation schemas used in the PharmaSys application.

## Structure

```
src/schemas/
├── generated/          # Auto-generated schemas from TypeScript types
│   ├── database.zod.ts
│   ├── forms.zod.ts
│   ├── invoice.zod.ts
│   ├── purchase.zod.ts
│   └── index.ts
├── manual/            # Manual schemas with custom business logic
│   ├── itemValidation.ts
│   └── index.ts
├── __tests__/         # Schema tests
│   └── generated-schemas.test.ts
└── index.ts           # Main export file
```

## Generated Schemas

Auto-generated from TypeScript type definitions using `ts-to-zod`.

### Available Schemas

#### Database Schemas (`database.zod.ts`)

- `CategorySchema`
- `MedicineTypeSchema`
- `UnitSchema`
- `ItemPackageSchema`
- `ItemDosageSchema`
- `ItemManufacturerSchema`
- `SupplierSchema`
- `CompanyProfileSchema`
- `CustomerLevelSchema`
- `CustomerLevelDiscountSchema`
- `PatientSchema`
- `DoctorSchema`
- `ItemSchema`
- `PackageConversionSchema`
- And more...

#### Form Schemas (`forms.zod.ts`)

- `FormDataSchema` - Item creation/edit form
- `PurchaseFormDataSchema` - Purchase invoice form
- `SaleFormDataSchema` - Sales transaction form

#### Invoice Schemas (`invoice.zod.ts`)

- `ExtractedInvoiceDataSchema` - OCR invoice extraction
- `ProductListItemSchema`
- `PaymentSummarySchema`

#### Purchase Schemas (`purchase.zod.ts`)

- `PurchaseItemSchema`
- `PurchaseDataSchema`
- `SubtotalsSchema`

## Manual Schemas

Custom schemas with business logic and refinements that cannot be auto-generated.

### Item Validation (`manual/itemValidation.ts`)

- `itemNameSchema` - Item name with min length validation
- `basePriceSchema` - Currency parser for Indonesian Rupiah format
- `sellPriceSchema` - Sell price validation
- `sellPriceComparisonSchema` - Dynamic price comparison
- `itemSchema` - Complete item validation with business rules

## Usage

### Importing Schemas

```typescript
// Import all schemas
import { CategorySchema, FormDataSchema } from '@/schemas';

// Import from specific generated file
import { CategorySchema } from '@/schemas/generated/database.zod';

// Import manual schemas
import {
  itemNameSchema,
  basePriceSchema,
} from '@/schemas/manual/itemValidation';
```

### Validating Data

```typescript
import { CategorySchema } from '@/schemas';

// Safe parse (returns result object)
const result = CategorySchema.safeParse(data);
if (result.success) {
  console.log('Valid:', result.data);
} else {
  console.error('Errors:', result.error);
}

// Direct parse (throws on error)
try {
  const validData = CategorySchema.parse(data);
} catch (error) {
  console.error('Validation failed:', error);
}
```

### Using with Forms

```typescript
import { useFieldValidation } from '@/hooks/forms/useFieldValidation';
import { itemNameSchema } from '@/schemas';

function MyComponent() {
  const nameValidation = useFieldValidation({
    schema: itemNameSchema,
    value: formData.name,
  });

  return <Input {...nameValidation} />;
}
```

## Regenerating Schemas

Schemas are automatically generated from TypeScript types. When you update types, regenerate schemas:

```bash
# Regenerate all schemas
yarn gen:schemas

# Regenerate specific schema
yarn gen:schemas:db        # Database types
yarn gen:schemas:forms     # Form types
yarn gen:schemas:invoice   # Invoice types
yarn gen:schemas:purchase  # Purchase types
```

## Configuration

Schema generation is configured in `ts-to-zod.config.mjs` at the project root.

### Config Example

```javascript
export default [
  {
    name: 'database',
    input: 'src/types/database.ts',
    output: 'src/schemas/generated/database.zod.ts',
    getSchemaName: identifier => `${identifier}Schema`,
  },
  // ... more configs
];
```

### Filtering Types

Some types are excluded from generation (e.g., React component props):

```javascript
{
  name: "forms",
  input: "src/types/forms.ts",
  output: "src/schemas/generated/forms.zod.ts",
  nameFilter: (name) => !name.includes('Props'), // Exclude component props
}
```

## Best Practices

### When to Use Generated Schemas

- ✅ API response validation
- ✅ Form data validation
- ✅ Database entity validation
- ✅ Edge Function input/output validation

### When to Use Manual Schemas

- ✅ Complex business logic (price comparisons, margin calculations)
- ✅ Custom parsing (currency formats, date formats)
- ✅ Cross-field validations
- ✅ Dynamic schemas (based on runtime conditions)

### When NOT to Generate Schemas

- ❌ React component props (TypeScript is sufficient)
- ❌ Function types (not supported by Zod)
- ❌ Types with complex generics
- ❌ UI-only types

## Testing

All generated schemas are tested in `__tests__/generated-schemas.test.ts`.

Run tests:

```bash
yarn test:run src/schemas/__tests__/generated-schemas.test.ts
```

## Migration Notes

### From Old Schema Location

The manual schema `itemValidation.ts` was moved from:

- Old: `src/schemas/itemValidation.ts`
- New: `src/schemas/manual/itemValidation.ts`

Update imports:

```typescript
// Old
import { itemNameSchema } from '@/schemas/itemValidation';

// New
import { itemNameSchema } from '@/schemas/manual/itemValidation';
// or
import { itemNameSchema } from '@/schemas';
```

## Troubleshooting

### Schema Generation Fails

If schema generation fails with React/JSX errors:

1. Check if the type includes React types (ReactNode, Dispatch, etc.)
2. Add `nameFilter` to exclude those types
3. Consider if the type really needs runtime validation

### Import Errors

If you see "Cannot find module" errors:

1. Regenerate schemas: `yarn gen:schemas`
2. Check the import path in generated files
3. Verify the type is exported in the source file

### Type Mismatches

If Zod validation passes but TypeScript complains:

1. Regenerate schemas to sync with latest types
2. Check for circular dependencies
3. Use `z.infer<typeof Schema>` to get the TypeScript type

## Additional Resources

- [Zod Documentation](https://zod.dev/)
- [ts-to-zod GitHub](https://github.com/fabien0102/ts-to-zod)
- [Zod v4 Changelog](https://zod.dev/v4/changelog)
