import { beforeEach, describe, expect, it } from 'vite-plus/test';
import { focusEditableIdentityField, focusIdentitySearchInput } from './focus';

describe('identity modal focus helpers', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('focuses the item search input when it is available', () => {
    const input = document.createElement('input');
    input.placeholder = 'Cari item';
    document.body.append(input);

    focusIdentitySearchInput();

    expect(document.activeElement).toBe(input);
  });

  it('focuses editable identity input and textarea fields by id', () => {
    const input = document.createElement('input');
    input.id = 'name';
    const textarea = document.createElement('textarea');
    textarea.id = 'address';
    document.body.append(input, textarea);

    focusEditableIdentityField('name');
    expect(document.activeElement).toBe(input);

    focusEditableIdentityField('address');
    expect(document.activeElement).toBe(textarea);
  });

  it('ignores non-editable elements with matching ids', () => {
    const button = document.createElement('button');
    button.id = 'name';
    document.body.append(button);

    focusEditableIdentityField('name');

    expect(document.activeElement).not.toBe(button);
  });
});
