import { describe, expect, it } from 'vite-plus/test';
import {
  focusFirstSectionField,
  getFirstFocusableSectionField,
} from './sectionFocus';

describe('section focus helpers', () => {
  it('returns the first focusable field inside section content', () => {
    const section = document.createElement('section');
    const outsideButton = document.createElement('button');
    const container = document.createElement('div');
    container.setAttribute('data-section-content', 'true');
    const disabledByTabIndex = document.createElement('div');
    disabledByTabIndex.tabIndex = -1;
    const input = document.createElement('input');

    section.append(outsideButton, container);
    container.append(disabledByTabIndex, input);

    expect(getFirstFocusableSectionField(section)).toBe(input);
  });

  it('focuses the first section field when one exists', () => {
    const section = document.createElement('section');
    const container = document.createElement('div');
    container.setAttribute('data-section-content', 'true');
    const input = document.createElement('input');
    container.append(input);
    section.append(container);
    document.body.append(section);

    focusFirstSectionField(section);

    expect(document.activeElement).toBe(input);
    section.remove();
  });

  it('does nothing when section content is missing', () => {
    expect(
      getFirstFocusableSectionField(document.createElement('section'))
    ).toBe(null);
    expect(() => focusFirstSectionField(null)).not.toThrow();
  });
});
