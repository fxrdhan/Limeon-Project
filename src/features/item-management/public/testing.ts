/**
 * Public testing surface for item-management utilities that need controlled
 * access to feature internals.
 */

export { saveItemBusinessLogic } from '../application/hooks/core/ItemMutationUtilities';
export { useEntity } from '../application/hooks/collections';
export type { EntityData } from '../application/hooks/collections/useEntityManager';
export type { ItemFormData } from '../shared/types';
