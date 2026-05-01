import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vite-plus/test';
import { useScrollManagement } from './useScrollManagement';

describe('useScrollManagement', () => {
  it('returns search results to the top when filtering from a scrolled list', () => {
    const container = document.createElement('div');
    Object.defineProperties(container, {
      clientHeight: { value: 120 },
      scrollHeight: { value: 400 },
    });
    container.scrollTop = 180;

    const optionsContainerRef = { current: container };
    const initialOptions = [
      { id: 'mukolitik', name: 'Mukolitik' },
      { id: 'oftalmologi', name: 'Oftalmologi' },
    ];

    const { rerender } = renderHook(props => useScrollManagement(props), {
      initialProps: {
        isOpen: true,
        filteredOptions: initialOptions,
        searchTerm: '',
        debouncedSearchTerm: '',
        optionsContainerRef,
        autoScrollOnOpen: false,
      },
    });

    rerender({
      isOpen: true,
      filteredOptions: [{ id: 'otologi', name: 'Otologi' }],
      searchTerm: 'oto',
      debouncedSearchTerm: 'oto',
      optionsContainerRef,
      autoScrollOnOpen: false,
    });

    expect(container.scrollTop).toBe(0);
  });

  it('returns to the selected option position when search is cleared', () => {
    const container = document.createElement('div');
    Object.defineProperties(container, {
      clientHeight: { value: 120 },
      scrollHeight: { value: 400 },
    });

    const firstOptionFrame = document.createElement('div');
    firstOptionFrame.setAttribute('data-dropdown-option-frame', '');
    firstOptionFrame.setAttribute('data-dropdown-option-index', '0');
    Object.defineProperties(firstOptionFrame, {
      offsetTop: { value: 0 },
      offsetHeight: { value: 40 },
    });

    const firstOption = document.createElement('button');
    firstOption.setAttribute('role', 'option');
    firstOption.setAttribute('data-dropdown-option-index', '0');
    firstOptionFrame.appendChild(firstOption);

    const secondOptionFrame = document.createElement('div');
    secondOptionFrame.setAttribute('data-dropdown-option-frame', '');
    secondOptionFrame.setAttribute('data-dropdown-option-index', '1');
    Object.defineProperties(secondOptionFrame, {
      offsetTop: { value: 220 },
      offsetHeight: { value: 40 },
    });

    const secondOption = document.createElement('button');
    secondOption.setAttribute('role', 'option');
    secondOption.setAttribute('data-dropdown-option-index', '1');
    secondOptionFrame.appendChild(secondOption);

    const optionsContainerRef = { current: container };
    const { rerender } = renderHook(props => useScrollManagement(props), {
      initialProps: {
        isOpen: true,
        filteredOptions: [{ id: 'otologi', name: 'Otologi' }],
        searchTerm: 'oto',
        debouncedSearchTerm: 'oto',
        selectedValue: 'mukolitik',
        optionsContainerRef,
        autoScrollOnOpen: false,
      },
    });

    rerender({
      isOpen: true,
      filteredOptions: [{ id: 'otologi', name: 'Otologi' }],
      searchTerm: '',
      debouncedSearchTerm: 'oto',
      selectedValue: 'mukolitik',
      optionsContainerRef,
      autoScrollOnOpen: false,
    });

    expect(container.scrollTop).toBe(0);

    container.appendChild(firstOptionFrame);
    container.appendChild(secondOptionFrame);

    rerender({
      isOpen: true,
      filteredOptions: [
        { id: 'otologi', name: 'Otologi' },
        { id: 'mukolitik', name: 'Mukolitik' },
      ],
      searchTerm: '',
      debouncedSearchTerm: '',
      selectedValue: 'mukolitik',
      optionsContainerRef,
      autoScrollOnOpen: false,
    });

    expect(container.scrollTop).toBe(214);
  });
});
