Grid State

This section covers saving and restoring the grid state, such as the filter model, selected rows, etc.

## Saving and Restoring State [Copy Link](https://www.ag-grid.com/react-data-grid/grid-state/#saving-and-restoring-state)

The following buttons log saving and restoring state to the developer console.

React Example - Grid State - Grid State

Recreate Grid with Current StatePrint State

Hide filesViewing: index.jsx

- styles.css
- index.jsx

Language:JavaScriptTypeScript

```jsx
'use client';
import React, {
  StrictMode,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import { createRoot } from "react-dom/client";
import {
  ClientSideRowModelModule,
  GridStateModule,
  ModuleRegistry,
  NumberFilterModule,
  PaginationModule,
  RowSelectionModule,
  ValidationModule,
} from "ag-grid-community";
import {
  CellSelectionModule,
  ColumnsToolPanelModule,
  FiltersToolPanelModule,
  PivotModule,
  SetFilterModule,
} from "ag-grid-enterprise";
import { AgGridReact } from "ag-grid-react";
import "./styles.css";

ModuleRegistry.registerModules([\
  NumberFilterModule,\
  RowSelectionModule,\
  GridStateModule,\
  PaginationModule,\
  ClientSideRowModelModule,\
  ColumnsToolPanelModule,\
  FiltersToolPanelModule,\
  SetFilterModule,\
  CellSelectionModule,\
  PivotModule,\
  ...(process.env.NODE_ENV !== "production" ? [ValidationModule] : []),\
]);

const GridExample = () => {
  const gridRef = useRef(null);
  const containerStyle = useMemo(() => ({ width: "100%", height: "100%" }), []);
  const gridStyle = useMemo(() => ({ height: "100%", width: "100%" }), []);
  const [rowData, setRowData] = useState();
  const [columnDefs, setColumnDefs] = useState([\
    { field: "athlete", minWidth: 150 },\
    { field: "age", maxWidth: 90 },\
    { field: "country", minWidth: 150 },\
    { field: "year", maxWidth: 90 },\
    { field: "date", minWidth: 150 },\
    { field: "sport", minWidth: 150 },\
    { field: "gold" },\
    { field: "silver" },\
    { field: "bronze" },\
    { field: "total" },\
  ]);
  const defaultColDef = useMemo(() => {
    return {
      flex: 1,
      minWidth: 100,
      filter: true,
      enableRowGroup: true,
      enablePivot: true,
      enableValue: true,
    };
  }, []);
  const rowSelection = useMemo(
    () => ({
      mode: "multiRow",
    }),
    [],
  );
  const [initialState, setInitialState] = useState();
  const [currentState, setCurrentState] = useState();
  const [gridVisible, setGridVisible] = useState(true);

  const onGridReady = useCallback((params) => {
    fetch("https://www.ag-grid.com/example-assets/olympic-winners.json")
      .then((resp) => resp.json())
      .then((data) => setRowData(data));
  }, []);

  const reloadGrid = useCallback(() => {
    setGridVisible(false);
    setTimeout(() => {
      setRowData(undefined);
      setGridVisible(true);
    });
  }, []);

  const onGridPreDestroyed = useCallback((params) => {
    const { state } = params;
    console.log("Grid state on destroy (can be persisted)", state);
    setInitialState(state);
  }, []);

  const onStateUpdated = useCallback((params) => {
    console.log("State updated", params.state);
    setCurrentState(params.state);
  }, []);

  const printState = useCallback(() => {
    console.log("Grid state", currentState);
  }, [currentState]);

  return (
    <div style={containerStyle}>
      <div className="example-wrapper">
        <div>
          <span className="button-group">
            <button onClick={reloadGrid}>
              Recreate Grid with Current State
            </button>
            <button onClick={printState}>Print State</button>
          </span>
        </div>
        <div style={gridStyle}>
          {gridVisible && (
            <AgGridReact
              ref={gridRef}
              rowData={rowData}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              sideBar={true}
              pagination={true}
              rowSelection={rowSelection}
              suppressColumnMoveAnimation={true}
              initialState={initialState}
              onGridReady={onGridReady}
              onGridPreDestroyed={onGridPreDestroyed}
              onStateUpdated={onStateUpdated}
            />
          )}
        </div>
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById("root"));
root.render(
  <StrictMode>
    <GridExample />
  </StrictMode>,
);

```

Console

Clear

```

State updated

{
...}

2
State updated

{
...}

```

The initial state is provided via the grid option `initialState`. It is only read once when the grid is created.

```jsx
const initialState = {
  filter: {
    filterModel: {
      year: {
        filterType: 'set',
        values: ['2012'],
      },
    },
  },
  columnVisibility: {
    hiddenColIds: ['athlete'],
  },
  rowGroup: {
    groupColIds: ['athlete'],
  },
};

<AgGridReact initialState={initialState} />;
```

The current grid state can be retrieved by listening to the state updated event, which is fired with the latest state when it changes, or via `api.getState()`.

The state is also passed in the [Grid Pre-Destroyed Event](https://www.ag-grid.com/react-data-grid/grid-lifecycle/#grid-pre-destroyed), which can be used to get the state when the grid is destroyed.

|                                                                                                                                                                                                                                                                                           |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| gridPreDestroyed [Copy Link](https://www.ag-grid.com/react-data-grid/grid-state/#reference-miscellaneous-gridPreDestroyed)<br>GridPreDestroyedEvent<br>Invoked immediately before the grid is destroyed. This is useful for cleanup logic that needs to run before the grid is torn down. |
| stateUpdated [Copy Link](https://www.ag-grid.com/react-data-grid/grid-state/#reference-miscellaneous-stateUpdated)<br>StateUpdatedEvent<br>Grid state has been updated.                                                                                                                   |

## State Contents [Copy Link](https://www.ag-grid.com/react-data-grid/grid-state/#state-contents)

The following is captured in the grid state:

- [Aggregation Functions](https://www.ag-grid.com/react-data-grid/aggregation/) (column state)
- [Opened Column Groups](https://www.ag-grid.com/react-data-grid/column-groups/)
- [Column Order](https://www.ag-grid.com/react-data-grid/column-moving/) (column state)
- [Pinned Columns](https://www.ag-grid.com/react-data-grid/column-pinning/) (column state)
- [Column Sizes](https://www.ag-grid.com/react-data-grid/column-sizing/) (column state)
- [Hidden Columns](https://www.ag-grid.com/react-data-grid/column-properties/#reference-display-hide) (column state)
- [Column Filter Model](https://www.ag-grid.com/react-data-grid/filtering/)
- [Advanced Filter Model](https://www.ag-grid.com/react-data-grid/filter-advanced/#filter-model--api)
- [Focused Cell](https://www.ag-grid.com/react-data-grid/keyboard-navigation/) ( [Client-Side Row Model](https://www.ag-grid.com/react-data-grid/row-models/) only)
- [Current Page](https://www.ag-grid.com/react-data-grid/row-pagination/)
- [Pivot Mode and Columns](https://www.ag-grid.com/react-data-grid/pivoting/) (column state)
- [Cell Selection](https://www.ag-grid.com/react-data-grid/cell-selection/)
- [Row Group Columns](https://www.ag-grid.com/react-data-grid/grouping/) (column state)
- [Expanded Row Groups](https://www.ag-grid.com/react-data-grid/grouping-opening-groups/)
- [Row Selection](https://www.ag-grid.com/react-data-grid/row-selection/) (retrievable for all row models, but can only be set for [Client-Side Row Model](https://www.ag-grid.com/react-data-grid/row-models/) and [Server-Side Row Model](https://www.ag-grid.com/react-data-grid/row-models/))
- [Pinned Rows](https://www.ag-grid.com/react-data-grid/row-pinning/)
- [Side Bar](https://www.ag-grid.com/react-data-grid/side-bar/)
- [Sort](https://www.ag-grid.com/react-data-grid/row-sorting/) (column state)

When restoring the current page using the [Server Side Row Model](https://www.ag-grid.com/react-data-grid/server-side-model/) or [Infinite Row Model](https://www.ag-grid.com/react-data-grid/infinite-scrolling/), additional configuration is required:

- For the Server Side Row Model - set the `serverSideInitialRowCount` property to a value which includes the rows to be shown.
- For the Infinite Row Model - set the `infiniteInitialRowCount` property to a value which includes the rows to be shown.

All state properties are optional, so a property can be excluded if you do not want to restore it.

If applying some but not all of the column state properties, then `initialState.partialColumnState` must be set to `true`.

The state also contains the grid version number. When applying state with older version numbers, any old state properties will be automatically migrated to the current format.

The grid state is designed to be serialisable, so any functions will be stripped out. For example, aggregation functions should be [Registered as Custom Functions](https://www.ag-grid.com/react-data-grid/aggregation-custom-functions/#registering-custom-functions) to work with state rather than being set as [Directly Applied Functions](https://www.ag-grid.com/react-data-grid/aggregation-custom-functions/#directly-applied-functions).

Properties available on the `GridState` interface.

|                                                                                                                                                                                                                                                                                                                                                                                                                             |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| version [Copy Link](https://www.ag-grid.com/react-data-grid/grid-state/#reference-GridState-version)<br>string<br>Grid version number                                                                                                                                                                                                                                                                                       |
| aggregation [Copy Link](https://www.ag-grid.com/react-data-grid/grid-state/#reference-GridState-aggregation)<br>AggregationState<br>Includes aggregation functions (column state)                                                                                                                                                                                                                                           |
| columnGroup [Copy Link](https://www.ag-grid.com/react-data-grid/grid-state/#reference-GridState-columnGroup)<br>ColumnGroupState<br>Includes opened groups                                                                                                                                                                                                                                                                  |
| columnOrder [Copy Link](https://www.ag-grid.com/react-data-grid/grid-state/#reference-GridState-columnOrder)<br>ColumnOrderState<br>Includes column ordering (column state)                                                                                                                                                                                                                                                 |
| columnPinning [Copy Link](https://www.ag-grid.com/react-data-grid/grid-state/#reference-GridState-columnPinning)<br>ColumnPinningState<br>Includes left/right pinned columns (column state)                                                                                                                                                                                                                                 |
| columnSizing [Copy Link](https://www.ag-grid.com/react-data-grid/grid-state/#reference-GridState-columnSizing)<br>ColumnSizingState<br>Includes column width/flex (column state)                                                                                                                                                                                                                                            |
| columnVisibility [Copy Link](https://www.ag-grid.com/react-data-grid/grid-state/#reference-GridState-columnVisibility)<br>ColumnVisibilityState<br>Includes hidden columns (column state)                                                                                                                                                                                                                                   |
| filter [Copy Link](https://www.ag-grid.com/react-data-grid/grid-state/#reference-GridState-filter)<br>FilterState<br>Includes Column Filters and Advanced Filter                                                                                                                                                                                                                                                            |
| focusedCell [Copy Link](https://www.ag-grid.com/react-data-grid/grid-state/#reference-GridState-focusedCell)<br>FocusedCellState<br>Includes currently focused cell. Works for Client-Side Row Model only                                                                                                                                                                                                                   |
| pagination [Copy Link](https://www.ag-grid.com/react-data-grid/grid-state/#reference-GridState-pagination)<br>PaginationState<br>Includes current page                                                                                                                                                                                                                                                                      |
| rowPinning [Copy Link](https://www.ag-grid.com/react-data-grid/grid-state/#reference-GridState-rowPinning)<br>RowPinningState<br>Includes currently manually pinned rows                                                                                                                                                                                                                                                    |
| pivot [Copy Link](https://www.ag-grid.com/react-data-grid/grid-state/#reference-GridState-pivot)<br>PivotState<br>Includes current pivot mode and pivot columns (column state)                                                                                                                                                                                                                                              |
| cellSelection [Copy Link](https://www.ag-grid.com/react-data-grid/grid-state/#reference-GridState-cellSelection)<br>CellSelectionState<br>Includes currently selected cell ranges                                                                                                                                                                                                                                           |
| rowGroup [Copy Link](https://www.ag-grid.com/react-data-grid/grid-state/#reference-GridState-rowGroup)<br>RowGroupState<br>Includes current row group columns (column state)                                                                                                                                                                                                                                                |
| rowGroupExpansion [Copy Link](https://www.ag-grid.com/react-data-grid/grid-state/#reference-GridState-rowGroupExpansion)<br>RowGroupExpansionState<br>Includes currently expanded group rows                                                                                                                                                                                                                                |
| rowSelection [Copy Link](https://www.ag-grid.com/react-data-grid/grid-state/#reference-GridState-rowSelection)<br>string\[\] \| ServerSideRowSelectionState \| ServerSideRowGroupSelectionState<br>Includes currently selected rows. For Server-Side Row Model, will be `ServerSideRowSelectionState                                                                                                                        | ServerSideRowGroupSelectionState`, for other row models, will be an array of row IDs. Can only be set for Client-Side Row Model and Server-Side Row Model. |
| scroll [Copy Link](https://www.ag-grid.com/react-data-grid/grid-state/#reference-GridState-scroll)<br>ScrollState<br>Includes current scroll position. Works for Client-Side Row Model only                                                                                                                                                                                                                                 |
| sideBar [Copy Link](https://www.ag-grid.com/react-data-grid/grid-state/#reference-GridState-sideBar)<br>SideBarState<br>Includes current Side Bar positioning and opened tool panel                                                                                                                                                                                                                                         |
| sort [Copy Link](https://www.ag-grid.com/react-data-grid/grid-state/#reference-GridState-sort)<br>SortState<br>Includes current sort columns and direction (column state)                                                                                                                                                                                                                                                   |
| partialColumnState [Copy Link](https://www.ag-grid.com/react-data-grid/grid-state/#reference-GridState-partialColumnState)<br>boolean<br>When providing a partial `initialState` with some but not all column state properties, set this to `true`. Not required if passing the whole state object retrieved from the grid. Not used for `api.setState()`, as that instead takes a second argument of properties to ignore. |

## Setting State [Copy Link](https://www.ag-grid.com/react-data-grid/grid-state/#setting-state)

The best way to restore grid state is via initial state as described above. However, it is also possible to restore state on an existing grid via `api.setState(state)`.

`setState` should only be used to restore grid state. The grid does not support being used as a controlled component, so do not call this on every state update.

React Example - Grid State - Set State

Save StateRecreate Grid with No StateSet StatePrint State

Hide filesViewing: index.jsx

- styles.css
- index.jsx

Language:JavaScriptTypeScript

```jsx
'use client';
import React, {
  StrictMode,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import { createRoot } from "react-dom/client";
import {
  ClientSideRowModelModule,
  GridStateModule,
  ModuleRegistry,
  NumberFilterModule,
  PaginationModule,
  RowSelectionModule,
  ValidationModule,
} from "ag-grid-community";
import {
  CellSelectionModule,
  ColumnsToolPanelModule,
  FiltersToolPanelModule,
  PivotModule,
  SetFilterModule,
} from "ag-grid-enterprise";
import { AgGridReact } from "ag-grid-react";
import "./styles.css";

ModuleRegistry.registerModules([\
  NumberFilterModule,\
  RowSelectionModule,\
  GridStateModule,\
  PaginationModule,\
  ClientSideRowModelModule,\
  ColumnsToolPanelModule,\
  FiltersToolPanelModule,\
  SetFilterModule,\
  CellSelectionModule,\
  PivotModule,\
  ...(process.env.NODE_ENV !== "production" ? [ValidationModule] : []),\
]);

const GridExample = () => {
  const gridRef = useRef(null);
  const containerStyle = useMemo(() => ({ width: "100%", height: "100%" }), []);
  const gridStyle = useMemo(() => ({ height: "100%", width: "100%" }), []);
  const [rowData, setRowData] = useState();
  const [columnDefs, setColumnDefs] = useState([\
    { field: "athlete", minWidth: 150 },\
    { field: "age", maxWidth: 90 },\
    { field: "country", minWidth: 150 },\
    { field: "year", maxWidth: 90 },\
    { field: "date", minWidth: 150 },\
    { field: "sport", minWidth: 150 },\
    { field: "gold" },\
    { field: "silver" },\
    { field: "bronze" },\
    { field: "total" },\
  ]);
  const defaultColDef = useMemo(() => {
    return {
      flex: 1,
      minWidth: 100,
      filter: true,
      enableRowGroup: true,
      enablePivot: true,
      enableValue: true,
    };
  }, []);
  const rowSelection = useMemo(
    () => ({
      mode: "multiRow",
    }),
    [],
  );
  const [currentState, setCurrentState] = useState();
  const [gridVisible, setGridVisible] = useState(true);
  const [savedState, setSavedState] = useState();

  const onGridReady = useCallback((params) => {
    fetch("https://www.ag-grid.com/example-assets/olympic-winners.json")
      .then((resp) => resp.json())
      .then((data) => setRowData(data));
  }, []);

  const reloadGrid = useCallback(() => {
    setGridVisible(false);
    setTimeout(() => {
      setRowData(undefined);
      setGridVisible(true);
    });
  }, []);

  const onGridPreDestroyed = useCallback((params) => {
    const { state } = params;
    console.log("Grid state on destroy (can be persisted)", state);
  }, []);

  const onStateUpdated = useCallback((params) => {
    console.log("State updated", params.state);
    setCurrentState(params.state);
  }, []);

  const printState = useCallback(() => {
    console.log("Grid state", currentState);
  }, [currentState]);

  const saveState = useCallback(() => {
    console.log("Saved state", currentState);
    setSavedState(currentState);
  }, [currentState]);

  const setState = useCallback(() => {
    if (savedState) {
      gridRef.current.api.setState(savedState);
      console.log("Set state", savedState);
    }
  }, [savedState]);

  return (
    <div style={containerStyle}>
      <div className="example-wrapper">
        <div>
          <span className="button-group">
            <button onClick={saveState}>Save State</button>
            <button onClick={reloadGrid}>Recreate Grid with No State</button>
            <button onClick={setState}>Set State</button>
            <button onClick={printState}>Print State</button>
          </span>
        </div>
        <div style={gridStyle}>
          {gridVisible && (
            <AgGridReact
              ref={gridRef}
              rowData={rowData}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              sideBar={true}
              pagination={true}
              rowSelection={rowSelection}
              suppressColumnMoveAnimation={true}
              onGridReady={onGridReady}
              onGridPreDestroyed={onGridPreDestroyed}
              onStateUpdated={onStateUpdated}
            />
          )}
        </div>
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById("root"));
root.render(
  <StrictMode>
    <GridExample />
  </StrictMode>,
);

```

Console

Clear

```

State updated

{
...}

State updated

{
...}

State updated

{
...}

```

It is possible to maintain the existing state for individual state contents by passing a second argument to `setState` that contains the top-level properties to ignore. E.g. `api.setState(state, ['filter'])` will maintain the existing filter state in the grid.

## Converting Column State to Grid State [Copy Link](https://www.ag-grid.com/react-data-grid/grid-state/#converting-column-state-to-grid-state)

State retrieved via the [Column State](https://www.ag-grid.com/react-data-grid/column-state/) APIs can be converted into grid state via the helper functions `convertColumnState` and `convertColumnGroupState`.

```jsx
const state = {
  ...convertColumnState(columnState),
  ...convertColumnGroupState(columnGroupState),
};
```
