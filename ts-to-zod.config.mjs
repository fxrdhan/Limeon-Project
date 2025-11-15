/**
 * ts-to-zod configuration
 *
 * @type {import("ts-to-zod").TsToZodConfig}
 */
export default [
  {
    name: "database",
    input: "src/types/database.ts",
    output: "src/schemas/generated/database.zod.ts",
    getSchemaName: (identifier) => `${identifier}Schema`,
  },
  {
    name: "forms",
    input: "src/types/forms.ts",
    output: "src/schemas/generated/forms.zod.ts",
    getSchemaName: (identifier) => `${identifier}Schema`,
    nameFilter: (name) => !name.includes('Props'), // Exclude component props with React types
  },
  {
    name: "invoice",
    input: "src/types/invoice.ts",
    output: "src/schemas/generated/invoice.zod.ts",
    getSchemaName: (identifier) => `${identifier}Schema`,
  },
  {
    name: "purchase",
    input: "src/types/purchase.ts",
    output: "src/schemas/generated/purchase.zod.ts",
    getSchemaName: (identifier) => `${identifier}Schema`,
    nameFilter: (name) => !name.includes('Props'), // Exclude component props with React types
  },
  // Components are mostly React props - TypeScript is sufficient for compile-time checking
  // Uncomment if you need runtime validation for specific component types
  // {
  //   name: "components",
  //   input: "src/types/components.ts",
  //   output: "src/schemas/generated/components.zod.ts",
  //   getSchemaName: (identifier) => `${identifier}Schema`,
  //   nameFilter: (name) => !name.includes('Props'), // Exclude component props with React types
  // },
];
