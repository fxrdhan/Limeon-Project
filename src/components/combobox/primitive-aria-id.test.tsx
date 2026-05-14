import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vite-plus/test';
import { Combobox } from './internal/primitive';

const fruitItems = ['Apple', 'Banana', 'Cherry'];

describe('Combobox primitive ARIA ids', () => {
  it('keeps list and item ids aligned with internal ARIA references', () => {
    const callerListProps: React.ComponentPropsWithoutRef<'div'> = {
      id: 'caller-listbox-id',
    };
    const callerItemProps: React.HTMLAttributes<HTMLElement> = {
      id: 'caller-banana-id',
    };

    render(
      <Combobox.Root
        items={fruitItems}
        defaultOpen
        highlightedIndex={1}
        itemToStringLabel={item => item}
        itemToStringValue={item => item}
      >
        <Combobox.Trigger aria-label="Fruit">
          <Combobox.Value placeholder="Choose fruit" />
        </Combobox.Trigger>
        <Combobox.Portal>
          <Combobox.Positioner>
            <Combobox.Popup initialFocus={false}>
              <Combobox.Input aria-label="Search fruit" />
              <Combobox.List<string> {...callerListProps}>
                {(item, index) => (
                  <Combobox.Item
                    {...(item === 'Banana' ? callerItemProps : {})}
                    key={item}
                    value={item}
                    index={index}
                  >
                    {item}
                  </Combobox.Item>
                )}
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    );

    const trigger = screen.getByRole('combobox', { name: /fruit/i });
    const searchInput = screen.getByRole('searchbox', {
      name: /search fruit/i,
    });
    const listbox = screen.getByRole('listbox');
    const banana = screen.getByRole('option', { name: /banana/i });

    expect(listbox.id).not.toBe('caller-listbox-id');
    expect(trigger.getAttribute('aria-controls')).toBe(listbox.id);
    expect(searchInput.getAttribute('aria-controls')).toBe(listbox.id);

    expect(banana.id).not.toBe('caller-banana-id');
    expect(trigger.getAttribute('aria-activedescendant')).toBe(banana.id);
    expect(searchInput.getAttribute('aria-activedescendant')).toBe(banana.id);
  });
});
