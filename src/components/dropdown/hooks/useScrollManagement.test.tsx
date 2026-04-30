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
        optionsContainerRef,
        autoScrollOnOpen: false,
      },
    });

    rerender({
      isOpen: true,
      filteredOptions: [{ id: 'otologi', name: 'Otologi' }],
      searchTerm: 'oto',
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

    const firstOption = document.createElement('button');
    firstOption.setAttribute('role', 'option');
    Object.defineProperties(firstOption, {
      offsetTop: { value: 0 },
      offsetHeight: { value: 40 },
    });

    const secondOption = document.createElement('button');
    secondOption.setAttribute('role', 'option');
    Object.defineProperties(secondOption, {
      offsetTop: { value: 220 },
      offsetHeight: { value: 40 },
    });

    const optionsContainerRef = { current: container };
    const { rerender } = renderHook(props => useScrollManagement(props), {
      initialProps: {
        isOpen: true,
        filteredOptions: [{ id: 'otologi', name: 'Otologi' }],
        searchTerm: 'oto',
        selectedValue: 'mukolitik',
        optionsContainerRef,
        autoScrollOnOpen: false,
      },
    });

    rerender({
      isOpen: true,
      filteredOptions: [{ id: 'otologi', name: 'Otologi' }],
      searchTerm: '',
      selectedValue: 'mukolitik',
      optionsContainerRef,
      autoScrollOnOpen: false,
    });

    expect(container.scrollTop).toBe(0);

    container.appendChild(firstOption);
    container.appendChild(secondOption);

    rerender({
      isOpen: true,
      filteredOptions: [
        { id: 'otologi', name: 'Otologi' },
        { id: 'mukolitik', name: 'Mukolitik' },
      ],
      searchTerm: '',
      selectedValue: 'mukolitik',
      optionsContainerRef,
      autoScrollOnOpen: false,
    });

    expect(container.scrollTop).toBe(214);
  });
});
