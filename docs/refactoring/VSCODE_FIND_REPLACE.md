# VS Code Find & Replace Patterns

Gunakan Find & Replace di VS Code (Ctrl+Shift+H) untuk update imports secara batch.

## 📋 Find & Replace Sequences

Jalankan replacements ini secara **berurutan** (dari atas ke bawah):

### Step 1: Update Folder Paths

#### 1.1 Main folder rename
```
Find:    features/item-management/
Replace: features/items/
```
- Enable: Case sensitive
- Files: `src/**/*.{ts,tsx}`

#### 1.2 Presentation to components
```
Find:    presentation/templates/item/
Replace: components/
```

```
Find:    presentation/templates/entity/
Replace: components/
```

```
Find:    presentation/templates/
Replace: components/
```

```
Find:    presentation/(atoms|molecules|organisms)/
Replace: components/
```
- Enable: Use Regular Expression

#### 1.3 Application/hooks to hooks
```
Find:    application/hooks/form/
Replace: hooks/
```

```
Find:    application/hooks/collections/
Replace: hooks/
```

```
Find:    application/hooks/core/
Replace: hooks/
```

```
Find:    application/hooks/ui/
Replace: hooks/
```

```
Find:    application/hooks/utils/
Replace: hooks/
```

```
Find:    application/hooks/
Replace: hooks/
```

#### 1.4 Domain to services
```
Find:    domain/use-cases/
Replace: services/
```

#### 1.5 Shared folders
```
Find:    shared/contexts/
Replace: contexts/
```

```
Find:    shared/types/
Replace: types/
```

```
Find:    shared/utils/
Replace: utils/
```

### Step 2: Update Component Names

#### 2.1 ItemManagementModal
```
Find:    ItemManagementModal
Replace: Modal
```
- Files: `src/features/items/**/*.{ts,tsx}`
- Note: This will rename imports, types, and usages

#### 2.2 ItemModalTemplate
```
Find:    ItemModalTemplate
Replace: ModalTemplate
```

#### 2.3 ItemFormSections
```
Find:    ItemFormSections
Replace: FormSections
```

#### 2.4 EntityManagementModal
```
Find:    EntityManagementModal
Replace: EntityModal
```

### Step 3: Update Hook Names

#### 3.1 useAddItemPageHandlers
```
Find:    useAddItemPageHandlers
Replace: useItem
```

#### 3.2 useItemFormValidation
```
Find:    useItemFormValidation
Replace: useValidation
```

#### 3.3 useGenericEntityManagement
```
Find:    useGenericEntityManagement
Replace: useEntityManager
```

#### 3.4 useItemModalOrchestrator
```
Find:    useItemModalOrchestrator
Replace: useModalState
```

#### 3.5 useAddItemForm
```
Find:    useAddItemForm
Replace: useItemForm
```

#### 3.6 useAddItemEventHandlers
```
Find:    useAddItemEventHandlers
Replace: useEventHandlers
```

#### 3.7 useAddItemUIState
```
Find:    useAddItemUIState
Replace: useUI
```

#### 3.8 useAddItemRefs
```
Find:    useAddItemRefs
Replace: useRefs
```

### Step 4: Update Context Names

#### 4.1 ItemManagementProvider
```
Find:    ItemManagementProvider
Replace: ItemProvider
```

#### 4.2 ItemManagementContextValue
```
Find:    ItemManagementContextValue
Replace: ItemContext
```

#### 4.3 ItemFormStateContext
```
Find:    ItemFormStateContext
Replace: ItemContext
```
- Note: You may need to manually merge contexts after this

### Step 5: Update Type Names

#### 5.1 Props
```
Find:    ItemManagementModalProps
Replace: ModalProps
```

```
Find:    UseItemManagementProps
Replace: UseItemProps
```

```
Find:    AddItemPageHandlersProps
Replace: UseItemProps
```

#### 5.2 Types
```
Find:    ItemManagementContextValue
Replace: ItemContextValue
```

### Step 6: Remove Redundant Prefixes (Regex)

Only run these if you're confident with regex!

#### 6.1 Remove "Item" prefix from hooks in items folder
```
Find:    (use)Item([A-Z]\w+)
Replace: $1$2
```
- Enable: Use Regular Expression
- Files: `src/features/items/hooks/*.ts`
- ⚠️ Review changes carefully before confirming!

#### 6.2 Remove "Item" prefix from components in items folder
```
Find:    (const|export|import.*\{.*?)Item([A-Z]\w+)
Replace: $1$2
```
- Enable: Use Regular Expression
- Files: `src/features/items/components/*.tsx`
- ⚠️ Review changes carefully before confirming!

## 🔍 Verification Queries

After replacements, use these to verify:

### Check for remaining old paths
```
Find: features/item-management/
```
Should return 0 results (except in backup files)

### Check for remaining long names
```
Find: ItemManagement
```
Should return 0 results in items folder

### Check for orphaned imports
```
Find: from ['"]\.\.\/\.\.\/\.\./
```
Should be minimal (only necessary cross-feature imports)

## 🎯 Advanced: Multi-cursor Editing

For complex renames, use multi-cursor:

1. Select word (e.g., `ItemManagementModal`)
2. Press `Ctrl+Shift+L` to select all occurrences
3. Type new name (e.g., `Modal`)
4. All occurrences updated at once

## 📝 Regex Patterns Reference

### Pattern 1: Update relative imports
```
Find:    from ['"](\.\.\/)+(application|presentation|shared)/
Replace: from '$1
```

### Pattern 2: Simplify long type names
```
Find:    (interface|type|export type) Item(\w+)(Props|State|Actions|Value)
Replace: $1 $2$3
```
- Files: `src/features/items/types/*.ts`

### Pattern 3: Remove "Add" prefix from hooks
```
Find:    useAdd(\w+)
Replace: use$1
```
- Files: `src/features/items/hooks/*.ts`

## ⚠️ Important Notes

1. **Order matters**: Run replacements in the order listed above
2. **Review changes**: Always review changes before applying
3. **Test incrementally**: Run `npm run type-check` after each major step
4. **Git commits**: Commit after each successful step
5. **Backup**: Keep backups before starting

## 🔄 Rollback

If something goes wrong:

```bash
# Revert all changes
git checkout .

# Or restore from backup
cp -r backups/refactor_TIMESTAMP/* src/features/
```

## 📊 Progress Checklist

- [ ] Step 1: Update folder paths
- [ ] Step 2: Update component names
- [ ] Step 3: Update hook names
- [ ] Step 4: Update context names
- [ ] Step 5: Update type names
- [ ] Step 6: Remove redundant prefixes (optional)
- [ ] Verification: Check for old paths
- [ ] Verification: Check for long names
- [ ] Run type-check: `npm run type-check`
- [ ] Run tests: `npm test`
- [ ] Manual review: Check critical files
- [ ] Commit: `git commit -m "refactor: simplify naming conventions"`

## 🎨 VS Code Settings

To make this easier, add to `.vscode/settings.json`:

```json
{
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.git": true,
    "**/backups": true
  },
  "search.useIgnoreFiles": true,
  "search.followSymlinks": false,
  "editor.find.autoFindInSelection": "multiline"
}
```

## 💡 Tips

1. **Use Search Editor**: `Ctrl+Shift+F` then `Alt+Enter` opens search results in editor
2. **Preview changes**: Use "Replace" (not "Replace All") for first few matches
3. **Undo**: `Ctrl+Z` works across files
4. **Git diff**: Check `git diff` frequently to see what changed
5. **File rename**: Use `F2` in explorer to rename files with auto-update imports

---

**Time estimate**: 2-3 hours for careful, thorough replacement
