import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DataGrid from './DataGrid';

const getDefaultGridConfigMock = vi.hoisted(() => vi.fn());
const capturedAgGridProps = vi.hoisted(() => ({
  current: null as Record<string, unknown> | null,
}));
const agGridRefValue = vi.hoisted(() => ({
  current: { api: null as Record<string, unknown> | null },
}));

vi.mock('./gridSetup', () => ({
  getDefaultGridConfig: getDefaultGridConfigMock,
}));

vi.mock('ag-grid-react', async () => {
  const react = await vi.importActual<typeof import('react')>('react');

  return {
    AgGridReact: react.forwardRef<HTMLElement, Record<string, unknown>>(
      (props, ref) => {
        capturedAgGridProps.current = props;

        if (ref && typeof ref !== 'function') {
          (ref as React.MutableRefObject<unknown>).current =
            agGridRefValue.current;
        }

        return react.createElement('div', { 'data-testid': 'ag-grid-react' });
      }
    ),
  };
});

describe('DataGrid', () => {
  beforeEach(() => {
    capturedAgGridProps.current = null;
    agGridRefValue.current.api = null;

    getDefaultGridConfigMock.mockReset();
    getDefaultGridConfigMock.mockReturnValue({
      defaultColDef: {
        sortable: true,
        resizable: true,
      },
      rowHeight: 32,
      suppressRowTransform: true,
    });
  });

  it('normalizes columnDefs by stripping flex and applies default menu tabs', () => {
    render(
      <DataGrid
        className="grid-root"
        style={{ height: 200 }}
        columnDefs={[
          { field: 'name', flex: 1 },
          {
            headerName: 'Group',
            children: [{ field: 'code', flex: 2 }],
          },
        ]}
      />
    );

    expect(screen.getByTestId('ag-grid-react')).toBeInTheDocument();

    const gridProps = capturedAgGridProps.current as {
      columnDefs: Array<Record<string, unknown>>;
      defaultColDef: { menuTabs?: string[] };
      rowHeight: number;
    };

    expect(gridProps.defaultColDef.menuTabs).toEqual([
      'filterMenuTab',
      'generalMenuTab',
      'columnsMenuTab',
    ]);
    expect(gridProps.rowHeight).toBe(32);
    expect(gridProps.columnDefs[0].flex).toBeUndefined();
    expect(
      (gridProps.columnDefs[1].children as Array<Record<string, unknown>>)[0]
        .flex
    ).toBeUndefined();
  });

  it('disables filtering and respects custom menu/context menu props', () => {
    const getMainMenuItems = vi.fn();
    const getContextMenuItems = vi.fn();

    render(
      <DataGrid
        columnDefs={[{ field: 'name', flex: 1 }]}
        disableFiltering={true}
        getMainMenuItems={getMainMenuItems}
        getContextMenuItems={getContextMenuItems}
      />
    );

    const gridProps = capturedAgGridProps.current as {
      defaultColDef: { filter?: boolean; menuTabs?: unknown[] };
      getMainMenuItems?: unknown;
      getContextMenuItems?: unknown;
    };

    expect(gridProps.defaultColDef.filter).toBe(false);
    expect(gridProps.defaultColDef.menuTabs).toEqual([]);
    expect(gridProps.getMainMenuItems).toBe(getMainMenuItems);
    expect(gridProps.getContextMenuItems).toBe(getContextMenuItems);
  });

  it('auto sizes configured columns on first render and calls external callback', () => {
    const autoSizeColumns = vi.fn();
    const sizeColumnsToFit = vi.fn();
    const onFirstDataRendered = vi.fn();

    agGridRefValue.current.api = {
      autoSizeColumns,
      sizeColumnsToFit,
      isDestroyed: vi.fn(() => false),
    };

    const ref = React.createRef<unknown>();

    render(
      <DataGrid
        ref={ref}
        columnDefs={[{ field: 'name' }]}
        autoSizeColumns={['name', 'code']}
        sizeColumnsToFit={true}
        onFirstDataRendered={onFirstDataRendered}
      />
    );

    const gridProps = capturedAgGridProps.current as {
      onFirstDataRendered: (event: Record<string, unknown>) => void;
    };
    const event = { api: {} };

    gridProps.onFirstDataRendered(event);

    expect(autoSizeColumns).toHaveBeenCalledWith(['name', 'code']);
    expect(sizeColumnsToFit).not.toHaveBeenCalled();
    expect(onFirstDataRendered).toHaveBeenCalledWith(event);
  });

  it('falls back to sizeColumnsToFit and skips resize when API is destroyed', () => {
    const autoSizeColumns = vi.fn();
    const sizeColumnsToFit = vi.fn();

    const onFirstDataRendered = vi.fn();
    const ref = React.createRef<unknown>();

    agGridRefValue.current.api = {
      autoSizeColumns,
      sizeColumnsToFit,
      isDestroyed: vi.fn(() => false),
    };

    const { rerender } = render(
      <DataGrid
        ref={ref}
        columnDefs={[{ field: 'name' }]}
        sizeColumnsToFit={true}
        onFirstDataRendered={onFirstDataRendered}
      />
    );

    let gridProps = capturedAgGridProps.current as {
      onFirstDataRendered: (event: Record<string, unknown>) => void;
    };

    gridProps.onFirstDataRendered({});
    expect(sizeColumnsToFit).toHaveBeenCalledTimes(1);

    agGridRefValue.current.api = {
      autoSizeColumns,
      sizeColumnsToFit,
      isDestroyed: vi.fn(() => true),
    };

    rerender(
      <DataGrid
        ref={ref}
        columnDefs={[{ field: 'name' }]}
        sizeColumnsToFit={true}
        onFirstDataRendered={onFirstDataRendered}
      />
    );

    gridProps = capturedAgGridProps.current as {
      onFirstDataRendered: (event: Record<string, unknown>) => void;
    };
    gridProps.onFirstDataRendered({});

    expect(sizeColumnsToFit).toHaveBeenCalledTimes(1);
    expect(onFirstDataRendered).toHaveBeenCalledTimes(2);
  });
});
