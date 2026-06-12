import { describe, expect, it } from 'vite-plus/test';
import { convertChangesToSegments, diffChars } from './jsdiff';

describe('jsdiff character diff', () => {
  it('keeps equal text as one unchanged segment', () => {
    expect(diffChars('ABC', 'ABC')).toEqual([
      {
        added: false,
        count: 3,
        removed: false,
        value: 'ABC',
      },
    ]);
  });

  it('marks inserted and removed character runs', () => {
    expect(convertChangesToSegments(diffChars('ABCD', 'AXYD'))).toEqual([
      { text: 'A', type: 'unchanged' },
      { text: 'BC', type: 'removed' },
      { text: 'XY', type: 'added' },
      { text: 'D', type: 'unchanged' },
    ]);
  });

  it('diffs unicode code points rather than UTF-16 halves', () => {
    expect(convertChangesToSegments(diffChars('A😀C', 'A😎C'))).toEqual([
      { text: 'A', type: 'unchanged' },
      { text: '😀', type: 'removed' },
      { text: '😎', type: 'added' },
      { text: 'C', type: 'unchanged' },
    ]);
  });
});
