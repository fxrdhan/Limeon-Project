# Debug Configuration

This directory contains debug configuration for the item management features.

## History Debug Logging

To enable console logging for history operations, modify the `HISTORY_DEBUG` flag in `debug.ts`:

```typescript
export const DEBUG_CONFIG = {
  // Set to true to enable console logs for history operations
  HISTORY_DEBUG: true, // Change this to true
} as const;
```

### What gets logged when enabled:

- History fetch operations and parameters
- Database query results and status
- Authentication status
- Error details
- History state changes

### Usage:

1. Open `src/features/item-management/config/debug.ts`
2. Change `HISTORY_DEBUG: false` to `HISTORY_DEBUG: true`
3. Save the file
4. Console logs will appear when using history features

### Important:

- **Always set back to `false` before committing to production**
- Debug logging should only be used during development
- Logs may contain sensitive database information

## Future Debug Flags

Additional debug flags can be added to the `DEBUG_CONFIG` object as needed:

```typescript
export const DEBUG_CONFIG = {
  HISTORY_DEBUG: false,
  ENTITY_DEBUG: false, // For entity operations
  SEARCH_DEBUG: false, // For search operations
} as const;
```
