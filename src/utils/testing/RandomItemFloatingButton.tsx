/**
 * Random Item Floating Button Component
 *
 * A floating action button that triggers random item creation for testing purposes.
 * Only appears on the items tab and provides visual feedback during creation.
 */

import { TbPlus } from 'react-icons/tb';
import {
  useRandomItemCreation,
  type UseRandomItemCreationOptions,
} from './useRandomItemCreation';

/**
 * Props for RandomItemFloatingButton component
 */
export interface RandomItemFloatingButtonProps {
  /** Whether the button should be visible and enabled */
  enabled?: boolean;
  /** Options for the random item creation hook */
  creationOptions?: UseRandomItemCreationOptions;
}

/**
 * Floating button component for random item generation
 */
export function RandomItemFloatingButton({
  enabled = true,
  creationOptions = {},
}: RandomItemFloatingButtonProps) {
  const randomItemCreation = useRandomItemCreation({
    enabled,
    ...creationOptions,
  });

  // Don't render if not enabled
  if (!enabled) {
    return null;
  }

  return (
    <button
      onClick={randomItemCreation.createRandomItem}
      disabled={randomItemCreation.isLoadingEntities}
      className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-full p-4 shadow-lg transition-all duration-200 hover:scale-105 z-50"
      title="Tambah Item Acak"
    >
      <TbPlus className="w-5 h-5" />
    </button>
  );
}
