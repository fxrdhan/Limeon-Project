export interface DiffSegment {
  type: 'unchanged' | 'added' | 'removed';
  text: string;
}

/**
 * Creates a character-level diff between two strings using a simple but reliable approach
 * Returns an array of segments with their types (unchanged, added, removed)
 */
export function createCharacterDiff(oldText: string, newText: string): DiffSegment[] {
  if (oldText === newText) {
    return [{ type: 'unchanged', text: newText }];
  }

  if (oldText === '') {
    return [{ type: 'added', text: newText }];
  }

  if (newText === '') {
    return [{ type: 'removed', text: oldText }];
  }

  // Find common prefix
  let prefixEnd = 0;
  const minLength = Math.min(oldText.length, newText.length);
  while (prefixEnd < minLength && oldText[prefixEnd] === newText[prefixEnd]) {
    prefixEnd++;
  }

  // Find common suffix
  let suffixStart = 0;
  let oldIdx = oldText.length - 1;
  let newIdx = newText.length - 1;
  while (
    oldIdx >= prefixEnd && 
    newIdx >= prefixEnd && 
    oldText[oldIdx] === newText[newIdx]
  ) {
    suffixStart++;
    oldIdx--;
    newIdx--;
  }

  const segments: DiffSegment[] = [];

  // Add common prefix
  if (prefixEnd > 0) {
    segments.push({
      type: 'unchanged',
      text: oldText.slice(0, prefixEnd)
    });
  }

  // Handle the middle part (differences)
  const oldMiddle = oldText.slice(prefixEnd, oldText.length - suffixStart);
  const newMiddle = newText.slice(prefixEnd, newText.length - suffixStart);

  if (oldMiddle.length > 0 && newMiddle.length > 0) {
    // Both have content - this is a replacement
    segments.push({
      type: 'removed',
      text: oldMiddle
    });
    segments.push({
      type: 'added',
      text: newMiddle
    });
  } else if (oldMiddle.length > 0) {
    // Only old has content - this is a deletion
    segments.push({
      type: 'removed',
      text: oldMiddle
    });
  } else if (newMiddle.length > 0) {
    // Only new has content - this is an addition
    segments.push({
      type: 'added',
      text: newMiddle
    });
  }

  // Add common suffix
  if (suffixStart > 0) {
    segments.push({
      type: 'unchanged',
      text: oldText.slice(oldText.length - suffixStart)
    });
  }

  return segments.filter(segment => segment.text.length > 0);
}

/**
 * Creates a word-level diff between two strings
 * Better for longer texts where character-level might be too granular
 */
export function createWordDiff(oldText: string, newText: string): DiffSegment[] {
  if (oldText === newText) {
    return [{ type: 'unchanged', text: newText }];
  }

  const oldWords = oldText.split(/(\s+)/);
  const newWords = newText.split(/(\s+)/);
  
  const segments: DiffSegment[] = [];
  let oldIndex = 0;
  let newIndex = 0;
  
  while (oldIndex < oldWords.length || newIndex < newWords.length) {
    if (oldIndex >= oldWords.length) {
      // Remaining words are additions
      segments.push({
        type: 'added',
        text: newWords.slice(newIndex).join('')
      });
      break;
    }
    
    if (newIndex >= newWords.length) {
      // Remaining words are deletions
      segments.push({
        type: 'removed',
        text: oldWords.slice(oldIndex).join('')
      });
      break;
    }
    
    if (oldWords[oldIndex] === newWords[newIndex]) {
      segments.push({
        type: 'unchanged',
        text: newWords[newIndex]
      });
      oldIndex++;
      newIndex++;
    } else {
      // Words don't match - add both as changed
      segments.push({
        type: 'removed',
        text: oldWords[oldIndex]
      });
      segments.push({
        type: 'added',
        text: newWords[newIndex]
      });
      oldIndex++;
      newIndex++;
    }
  }
  
  return segments;
}