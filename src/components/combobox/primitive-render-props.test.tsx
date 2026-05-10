import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vite-plus/test';
import { Combobox } from './index';
import { preventComboboxHandler } from './utils/preset-dom';

const fruitItems = ['Apple', 'Banana', 'Cherry'];

describe('Combobox primitive render props', () => {
  it('composes props for primitive render elements', () => {
    const triggerRef = React.createRef<HTMLButtonElement>();
    const itemRef = React.createRef<HTMLButtonElement>();
    const onTriggerClick = vi.fn();
    const onTriggerDoubleClick = vi.fn();
    const onTriggerFocus = vi.fn();
    const onTriggerPointerDown = vi.fn();
    const onRenderedTriggerDoubleClick = vi.fn();
    const onRenderedTriggerFocus = vi.fn();
    const onRenderedTriggerPointerDown = vi.fn();
    const onItemClick = vi.fn();
    const onItemContextMenu = vi.fn();
    const onItemFocus = vi.fn();
    const onItemPointerDown = vi.fn();
    const onRenderedItemContextMenu = vi.fn();
    const onRenderedItemFocus = vi.fn();
    const onRenderedItemPointerDown = vi.fn();
    const onItemMouseEnter = vi.fn();
    const onValueChange = vi.fn();

    render(
      <Combobox.Root
        items={fruitItems}
        onValueChange={onValueChange}
        itemToStringLabel={item => item}
        itemToStringValue={item => item}
      >
        <Combobox.Trigger
          aria-label="Fruit"
          className="trigger-prop"
          style={{ backgroundColor: 'blue' }}
          onDoubleClick={onTriggerDoubleClick}
          onFocus={onTriggerFocus}
          onPointerDown={onTriggerPointerDown}
          render={
            <button
              ref={triggerRef}
              data-render-trigger="kept"
              className="trigger-render"
              style={{ color: 'red' }}
              title="render trigger title"
              onClick={onTriggerClick}
              onDoubleClick={onRenderedTriggerDoubleClick}
              onFocus={onRenderedTriggerFocus}
              onPointerDown={onRenderedTriggerPointerDown}
            >
              Fruit trigger
            </button>
          }
        />
        <Combobox.Portal>
          <Combobox.Positioner>
            <Combobox.Popup initialFocus={false}>
              <Combobox.List<string>>
                {(item, index) => (
                  <Combobox.Item
                    key={item}
                    value={item}
                    index={index}
                    className="item-prop"
                    style={{ backgroundColor: 'yellow' }}
                    onContextMenu={onItemContextMenu}
                    onFocus={onItemFocus}
                    onPointerDown={onItemPointerDown}
                    render={
                      item === 'Banana' ? (
                        <button
                          type="button"
                          ref={itemRef}
                          data-render-item="kept"
                          className="item-render"
                          style={{ color: 'green' }}
                          title="render item title"
                          onContextMenu={onRenderedItemContextMenu}
                          onClick={onItemClick}
                          onFocus={onRenderedItemFocus}
                          onMouseEnter={onItemMouseEnter}
                          onPointerDown={onRenderedItemPointerDown}
                        >
                          {item}
                        </button>
                      ) : undefined
                    }
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

    expect(triggerRef.current?.getAttribute('role')).toBe('combobox');
    expect(triggerRef.current?.getAttribute('data-render-trigger')).toBe(
      'kept'
    );
    expect(triggerRef.current?.getAttribute('title')).toBe(
      'render trigger title'
    );
    expect(triggerRef.current?.className).toContain('trigger-render');
    expect(triggerRef.current?.className).toContain('trigger-prop');
    expect(triggerRef.current?.style.color).toBe('red');
    expect(triggerRef.current?.style.backgroundColor).toBe('blue');

    fireEvent.focus(triggerRef.current as HTMLButtonElement);
    fireEvent.pointerDown(triggerRef.current as HTMLButtonElement);
    fireEvent.doubleClick(triggerRef.current as HTMLButtonElement);
    fireEvent.click(triggerRef.current as HTMLButtonElement);
    expect(onTriggerClick).toHaveBeenCalledTimes(1);
    expect(onRenderedTriggerDoubleClick).toHaveBeenCalledTimes(1);
    expect(onTriggerDoubleClick).toHaveBeenCalledTimes(1);
    expect(onRenderedTriggerFocus).toHaveBeenCalledTimes(1);
    expect(onTriggerFocus).toHaveBeenCalledTimes(1);
    expect(onRenderedTriggerPointerDown).toHaveBeenCalledTimes(1);
    expect(onTriggerPointerDown).toHaveBeenCalledTimes(1);
    expect(itemRef.current?.getAttribute('role')).toBe('option');
    expect(itemRef.current?.getAttribute('data-render-item')).toBe('kept');
    expect(itemRef.current?.getAttribute('title')).toBe('render item title');
    expect(itemRef.current?.className).toContain('item-render');
    expect(itemRef.current?.className).toContain('item-prop');
    expect(itemRef.current?.style.color).toBe('green');
    expect(itemRef.current?.style.backgroundColor).toBe('yellow');
    fireEvent.focus(itemRef.current as HTMLButtonElement);
    fireEvent.pointerDown(itemRef.current as HTMLButtonElement);
    fireEvent.contextMenu(itemRef.current as HTMLButtonElement);
    fireEvent.mouseEnter(itemRef.current as HTMLButtonElement);
    fireEvent.click(itemRef.current as HTMLButtonElement);

    expect(onRenderedItemContextMenu).toHaveBeenCalledTimes(1);
    expect(onItemContextMenu).toHaveBeenCalledTimes(1);
    expect(onRenderedItemFocus).toHaveBeenCalledTimes(1);
    expect(onItemFocus).toHaveBeenCalledTimes(1);
    expect(onRenderedItemPointerDown).toHaveBeenCalledTimes(1);
    expect(onItemPointerDown).toHaveBeenCalledTimes(1);
    expect(onItemMouseEnter).toHaveBeenCalledTimes(1);
    expect(onItemClick).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith(
      'Banana',
      expect.objectContaining({ reason: 'item-press' })
    );
  });

  it('passes children through primitive render functions', () => {
    render(
      <Combobox.Root
        defaultOpen
        items={fruitItems}
        itemToStringLabel={item => item}
        itemToStringValue={item => item}
      >
        <Combobox.Trigger
          aria-label="Fruit"
          render={props => (
            <button {...props} type="button">
              {props.children}
            </button>
          )}
        >
          Trigger child
        </Combobox.Trigger>
        <Combobox.Portal>
          <Combobox.Positioner>
            <Combobox.Popup initialFocus={false}>
              <Combobox.List<string>>
                {(item, index) => (
                  <Combobox.Item
                    key={item}
                    value={item}
                    index={index}
                    render={({ children, ref: _ref, ...itemProps }) => (
                      <div {...itemProps}>{children}</div>
                    )}
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

    expect(screen.getByRole('combobox').textContent).toBe('Trigger child');
    expect(screen.getByRole('option', { name: /banana/i }).textContent).toBe(
      'Banana'
    );
  });

  it('lets primitive render trigger elements prevent internal handling', () => {
    render(
      <Combobox.Root
        items={fruitItems}
        itemToStringLabel={item => item}
        itemToStringValue={item => item}
      >
        <Combobox.Trigger
          aria-label="Fruit"
          render={
            <button
              type="button"
              onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                preventComboboxHandler(event);
              }}
            >
              Fruit trigger
            </button>
          }
        />
        <Combobox.Portal>
          <Combobox.Positioner>
            <Combobox.Popup initialFocus={false}>
              <Combobox.List<string>>
                {(item, index) => (
                  <Combobox.Item key={item} value={item} index={index}>
                    {item}
                  </Combobox.Item>
                )}
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    );

    fireEvent.click(screen.getByRole('combobox', { name: /fruit/i }));

    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('lets primitive render item elements prevent internal handling', () => {
    const onValueChange = vi.fn();

    render(
      <Combobox.Root
        defaultOpen
        items={fruitItems}
        onValueChange={onValueChange}
        itemToStringLabel={item => item}
        itemToStringValue={item => item}
      >
        <Combobox.Trigger aria-label="Fruit">
          <Combobox.Value placeholder="Choose fruit" />
        </Combobox.Trigger>
        <Combobox.Portal>
          <Combobox.Positioner>
            <Combobox.Popup initialFocus={false}>
              <Combobox.List<string>>
                {(item, index) => (
                  <Combobox.Item
                    key={item}
                    value={item}
                    index={index}
                    render={
                      item === 'Banana' ? (
                        <button
                          type="button"
                          onClick={(
                            event: React.MouseEvent<HTMLButtonElement>
                          ) => {
                            preventComboboxHandler(event);
                          }}
                        >
                          {item}
                        </button>
                      ) : undefined
                    }
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

    fireEvent.click(screen.getByRole('option', { name: 'Banana' }));

    expect(onValueChange).not.toHaveBeenCalled();
    expect(screen.getByRole('listbox')).toBeTruthy();
  });
});
