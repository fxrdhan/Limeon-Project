# Refactoring Documentation: Naming Simplification

## 📚 Overview

Dokumentasi ini berisi panduan lengkap untuk menyederhanakan naming convention di codebase PharmaSys yang saat ini terlalu verbose dan membingungkan.

## 🎯 Masalah yang Diidentifikasi

### Statistik
- **Average file name length**: 28 characters (target: 15)
- **Average path depth**: 7 levels (target: 4)
- **Number of contexts**: 9+ (target: 2-3)
- **Average hook name**: 22 characters (target: 12)

### Contoh Masalah
```
❌ /features/item-management/presentation/templates/item/ItemManagementModal.tsx
❌ useAddItemPageHandlers (151 lines, returns 38+ properties)
❌ ItemManagementContextValue with 9 separate contexts
```

## 📖 Dokumentasi

### 1. [NAMING_IMPROVEMENTS.md](./NAMING_IMPROVEMENTS.md)
**Panduan lengkap penyederhanaan naming**
- 📋 Masalah yang ditemukan
- 💡 Rencana refactoring
- 📝 Contoh refactoring konkret
- 🎨 Naming guidelines
- 📊 Impact analysis
- ⚠️ Migration strategy
- ✅ Checklist

**Baca ini untuk**: Memahami keseluruhan masalah dan solusinya

---

### 2. [EXAMPLE_REFACTORING.md](./EXAMPLE_REFACTORING.md)
**Contoh refactoring step-by-step**
- 📁 Struktur before vs after
- 🔄 Step-by-step refactoring
- 📊 Comparison table
- 🚀 Migration commands
- ✅ Testing checklist

**Baca ini untuk**: Melihat contoh konkret bagaimana melakukan refactoring

---

### 3. [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)
**Quick reference guide**
- 🎯 Prinsip utama
- 📋 Naming patterns
- 🔄 Common transformations
- 📁 File organization
- 🚫 Anti-patterns

**Baca ini untuk**: Quick lookup saat melakukan refactoring

---

### 4. [VSCODE_FIND_REPLACE.md](./VSCODE_FIND_REPLACE.md)
**VS Code find & replace patterns**
- 📋 Find & replace sequences
- 🔍 Verification queries
- 🎯 Advanced multi-cursor editing
- 📝 Regex patterns
- 💡 Tips & tricks

**Baca ini untuk**: Panduan teknis update imports dan names

---

### 5. [refactor-naming.sh](../../scripts/refactor-naming.sh)
**Automated refactoring script**
- 🔄 Rename folders automatically
- 📝 Rename files automatically
- ✅ Type checking
- 🧪 Run tests
- 💾 Automatic backups

**Gunakan ini untuk**: Automasi sebagian besar proses refactoring

## 🚀 Quick Start

### Option 1: Automated (Recommended)
```bash
# Run the script
./scripts/refactor-naming.sh

# Follow the prompts
# It will create backups automatically
```

### Option 2: Manual
1. Read [NAMING_IMPROVEMENTS.md](./NAMING_IMPROVEMENTS.md) - Understand the problem
2. Read [EXAMPLE_REFACTORING.md](./EXAMPLE_REFACTORING.md) - See examples
3. Use [VSCODE_FIND_REPLACE.md](./VSCODE_FIND_REPLACE.md) - Execute changes
4. Refer to [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - As needed

## 📊 Refactoring Phases

### Phase 1: Folder Structure (1 day)
- Rename `item-management` → `items`
- Flatten `presentation/` → `components/`
- Flatten `application/hooks/` → `hooks/`
- Rename `domain/` → `services/`

### Phase 2: File Names (1 day)
- `ItemManagementModal.tsx` → `Modal.tsx`
- `useAddItemPageHandlers.ts` → `useItem.ts`
- `ItemFormSections.tsx` → `FormSections.tsx`

### Phase 3: Context Consolidation (1 day)
- Merge 9 contexts into 2-3
- Simplify context provider
- Update all context consumers

### Phase 4: Import Updates (1 day)
- Update all import paths
- Fix TypeScript errors
- Run type-check

### Phase 5: Testing & Review (1 day)
- Run all tests
- Manual QA
- Code review
- Documentation update

**Total Estimated Time**: 5 days

## 🎯 Expected Results

### Before
```typescript
// Import nightmare
import { ItemManagementModal } from '@/features/item-management/presentation/templates/item/ItemManagementModal';
import { useAddItemPageHandlers } from '@/features/item-management/application/hooks/form/useItemPageHandlers';
import { ItemManagementProvider } from '@/features/item-management/shared/contexts/ItemFormContext';

// 9 separate contexts
const formState = useContext(ItemFormStateContext);
const uiState = useContext(ItemUIStateContext);
const modalState = useContext(ItemModalStateContext);
// ... 6 more

// Complex component tree
features/item-management/presentation/templates/item/ItemManagementModal.tsx
```

### After
```typescript
// Clean imports
import { Modal } from '@/features/items/components/Modal';
import { useItem } from '@/features/items/hooks/useItem';
import { ItemProvider } from '@/features/items/contexts/ItemContext';

// 1-2 contexts
const { state, actions } = useItemContext();

// Simple component tree
features/items/components/Modal.tsx
```

### Metrics Improvement
- File name length: **-46%** (28 → 15 chars)
- Path depth: **-43%** (7 → 4 levels)
- Hook name length: **-45%** (22 → 12 chars)
- Context count: **-70%** (9 → 2-3)
- Import path length: **-60%** (80+ → 30 chars)

## ✅ Success Criteria

- [ ] All file names < 20 characters
- [ ] All import paths < 50 characters
- [ ] Folder depth ≤ 4 levels
- [ ] Context count ≤ 3 per feature
- [ ] No TypeScript errors
- [ ] All tests passing
- [ ] Code review approved
- [ ] Documentation updated

## ⚠️ Risks & Mitigation

### Risk 1: Breaking Changes
**Mitigation**: 
- Create backups before starting
- Use git branches
- Test thoroughly at each step

### Risk 2: Import Errors
**Mitigation**:
- Use TypeScript compiler to catch errors
- Use VS Code's auto-fix feature
- Run type-check frequently

### Risk 3: Merge Conflicts
**Mitigation**:
- Do refactoring in separate branch
- Communicate with team
- Merge when feature branches are stable

### Risk 4: Lost Productivity
**Mitigation**:
- Do during low-activity period
- Complete in 1 week sprint
- Provide migration guide

## 📞 Support

### Questions?
1. Check [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)
2. Review examples in [EXAMPLE_REFACTORING.md](./EXAMPLE_REFACTORING.md)
3. Ask in team chat

### Issues?
1. Check git diff: `git diff`
2. Check TypeScript: `npm run type-check`
3. Rollback if needed: `git checkout .`

## 📈 Progress Tracking

Create a GitHub issue or Trello card:

```
# Naming Refactoring Progress

## Phase 1: Folder Structure ⏳
- [ ] Rename main folder
- [ ] Flatten presentation
- [ ] Flatten hooks
- [ ] Rename domain

## Phase 2: File Names ⏳
- [ ] Component files
- [ ] Hook files
- [ ] Context files
- [ ] Type files

## Phase 3: Context Consolidation ⏳
- [ ] Merge contexts
- [ ] Update providers
- [ ] Update consumers

## Phase 4: Import Updates ⏳
- [ ] Update folder paths
- [ ] Update component names
- [ ] Update hook names
- [ ] Fix TypeScript errors

## Phase 5: Testing ⏳
- [ ] Run type-check
- [ ] Run all tests
- [ ] Manual QA
- [ ] Code review
- [ ] Documentation

## Metrics 📊
- File name length: 28 → __
- Path depth: 7 → __
- Context count: 9 → __
- TypeScript errors: __ → 0
- Tests passing: __/__
```

## 🎉 Next Steps After Refactoring

1. **Update onboarding docs** - New team members need updated guides
2. **Update contributing guidelines** - Document new naming conventions
3. **Create linting rules** - Enforce naming conventions
4. **Share learnings** - Blog post / team presentation
5. **Apply to other features** - Use same pattern for other features

## 📚 Additional Resources

### Related Patterns
- [Feature-Sliced Design](https://feature-sliced.design/)
- [Bulletproof React](https://github.com/alan2207/bulletproof-react)
- [React File Structure Best Practices](https://react.dev/learn/thinking-in-react)

### Naming Conventions
- [Clean Code JavaScript](https://github.com/ryanmcdermott/clean-code-javascript)
- [Airbnb Style Guide](https://github.com/airbnb/javascript)
- [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)

## 🔖 Document History

| Date | Version | Changes |
|------|---------|---------|
| 2025-01-19 | 1.0 | Initial documentation |

---

**Author**: Cascade AI  
**Last Updated**: January 19, 2025  
**Status**: Ready for Review

## 💬 Feedback

Punya saran untuk improve dokumentasi ini? Silakan buat PR atau diskusi di team chat!

---

**Remember**: Good code is like a good joke - it needs no explanation!
