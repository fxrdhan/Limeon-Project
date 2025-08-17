State & Lifecycle

This section covers some common lifecycle events that are raised after grid initialisation, data updates, and before the grid is destroyed.

The events on this page are listed in the order they are raised.

## Grid Ready [Copy Link](https://www.ag-grid.com/react-data-grid/grid-lifecycle/#grid-ready)

The `gridReady` event fires upon grid initialisation but the grid may not be fully rendered.

**Common Uses**

- Customising Grid via API calls.
- Event listener setup.
- Grid-dependent setup code.

In this example, `gridReady` applies user pinning preferences before rendering data.

React Example - Grid Lifecycle - Grid Ready

Hide filesViewing: index.jsx

- styles.css
- data.jsx
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
  ColumnApiModule,
  ModuleRegistry,
  ValidationModule,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";

import { getData } from "./data";
import "./styles.css";

ModuleRegistry.registerModules([\
  ColumnApiModule,\
  ClientSideRowModelModule,\
  ...(process.env.NODE_ENV !== "production" ? [ValidationModule] : []),\
]);

const GridExample = () => {
  const gridRef = useRef(null);
  const [gridKey, setGridKey] = useState(`grid-key-${Math.random()}`);
  const containerStyle = useMemo(() => ({ width: "100%", height: "100%" }), []);
  const gridStyle = useMemo(() => ({ height: "100%", width: "100%" }), []);
  const [rowData, setRowData] = useState(getData());

  const [columnDefs, setColumnDefs] = useState([\
    { field: "name", headerName: "Athlete", width: 250 },\
    { field: "person.country", headerName: "Country" },\
    { field: "person.age", headerName: "Age" },\
    { field: "medals.gold", headerName: "Gold Medals" },\
    { field: "medals.silver", headerName: "Silver Medals" },\
    { field: "medals.bronze", headerName: "Bronze Medals" },\
  ]);

  const onGridReady = useCallback((params) => {
    const checkbox = document.querySelector("#pinFirstColumnOnLoad");
    const shouldPinFirstColumn = checkbox && checkbox.checked;
    if (shouldPinFirstColumn) {
      params.api.applyColumnState({
        state: [{ colId: "name", pinned: "left" }],
      });
    }
  }, []);

  const reloadGrid = useCallback(() => {
    // Trigger re-load by assigning a new key to the Grid React component
    setGridKey(`grid-key-${Math.random()}`);
  }, []);

  return (
    <div style={containerStyle}>
      <div className="test-container">
        <div className="test-header">
          <div style={{ marginBottom: "1rem" }}>
            <input type="checkbox" id="pinFirstColumnOnLoad" />
            <label htmlFor="pinFirstColumnOnLoad">
              Pin first column on load
            </label>
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <button id="reloadGridButton" onClick={reloadGrid}>
              Reload Grid
            </button>
          </div>
        </div>

        <div style={gridStyle}>
          <AgGridReact
            key={gridKey}
            ref={gridRef}
            rowData={rowData}
            columnDefs={columnDefs}
            onGridReady={onGridReady}
          />
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

## First Data Rendered [Copy Link](https://www.ag-grid.com/react-data-grid/grid-lifecycle/#first-data-rendered)

The `firstDataRendered` event fires the first time data is rendered into the grid. It will only be fired once unlike `rowDataUpdated` which is fired on every data change.

## Row Data Updated [Copy Link](https://www.ag-grid.com/react-data-grid/grid-lifecycle/#row-data-updated)

The `rowDataUpdated` event fires every time the grid's data changes, by [Updating Row Data](https://www.ag-grid.com/react-data-grid/data-update-row-data/) or by applying [Transaction Updates](https://www.ag-grid.com/react-data-grid/data-update-transactions/). In the [Server Side Row Model](https://www.ag-grid.com/react-data-grid/server-side-model/), use the [Model Updated Event](https://www.ag-grid.com/react-data-grid/grid-events/#reference-miscellaneous-modelUpdated) instead.

In this example the time at which `firstDataRendered` and `rowDataUpdated` are fired is recorded above the grid. Note that `firstDataRendered` is only set on the initial load of the grid and is not updated when reloading data.

React Example - Grid Lifecycle - Row Data Updated

Hide filesViewing: index.jsx

- styles.css
- data.jsx
- index.jsx

Language:JavaScriptTypeScript

```jsx
'use client';
import React, { StrictMode, useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

import {
  ClientSideRowModelModule,
  ModuleRegistry,
  ValidationModule,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";

import { fetchDataAsync } from "./data";
import "./styles.css";

ModuleRegistry.registerModules([\
  ClientSideRowModelModule,\
  ...(process.env.NODE_ENV !== "production" ? [ValidationModule] : []),\
]);

const updateRowCount = (id) => {
  const element = document.querySelector(`#${id} > .value`);
  element.textContent = `${new Date().toLocaleTimeString()}`;
};

const columnDefs = [\
  { field: "name", headerName: "Athlete" },\
  { field: "person.age", headerName: "Age" },\
  { field: "medals.gold", headerName: "Gold Medals" },\
];

const GridExample = () => {
  const [loading, setLoading] = useState(true);
  const [rowData, setRowData] = useState();

  const onFirstDataRendered = useCallback((event) => {
    updateRowCount("firstDataRendered");
    console.log("First Data Rendered");
  }, []);

  const onRowDataUpdated = useCallback((event) => {
    updateRowCount("rowDataUpdated");
    console.log("Row Data Updated");
  }, []);

  const reloadData = useCallback(() => {
    console.log("Loading Data ...");
    setLoading(true);
    fetchDataAsync()
      .then((data) => {
        console.info("Data Loaded");
        setRowData(data);
      })
      .catch((error) => {
        console.error("Failed to load data", error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(reloadData, []);

  return (
    <div className="test-container">
      <div className="test-header">
        <div id="firstDataRendered">
          First Data Rendered: <span className="value">-</span>
        </div>
        <div id="rowDataUpdated">
          Row Data Updated: <span className="value">-</span>
        </div>
        <div>
          <button disabled={loading} onClick={reloadData}>
            Reload Data
          </button>
        </div>
      </div>

      <div style={{ height: "100%" }}>
        <AgGridReact
          loading={loading}
          rowData={rowData}
          columnDefs={columnDefs}
          onFirstDataRendered={onFirstDataRendered}
          onRowDataUpdated={onRowDataUpdated}
        />
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

Loading Data ...

Data Loaded

Row Data Updated

First Data Rendered
```

## Grid Pre-Destroyed [Copy Link](https://www.ag-grid.com/react-data-grid/grid-lifecycle/#grid-pre-destroyed)

The `gridPreDestroyed` event fires just before the grid is destroyed and is removed from the DOM.

**Common Uses**

- Clean up resources.
- Save grid state.
- Disconnect other libraries.

In this example, `gridPreDestroyed` saves column widths before grid destruction.

React Example - Grid Lifecycle - Grid Pre Destroyed

Change Columns WidthDestroy Grid

Hide filesViewing: index.jsx

- styles.css
- data.jsx
- index.jsx

Language:JavaScriptTypeScript

```jsx
'use client';
import React, { StrictMode, useCallback, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ClientSideRowModelModule,
  ColumnApiModule,
  ModuleRegistry,
  ValidationModule,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { getData } from "./data";
import "./styles.css";

ModuleRegistry.registerModules([\
  ColumnApiModule,\
  ClientSideRowModelModule,\
  ...(process.env.NODE_ENV !== "production" ? [ValidationModule] : []),\
]);

const GridExample = () => {
  const containerStyle = useMemo(() => ({ width: "100%", height: "100%" }), []);
  const [gridVisible, setGridVisible] = useState(true);
  const [columnsWidthOnPreDestroyed, setColumnsWidthOnPreDestroyed] = useState(
    [],
  );
  const [gridApi, setGridApi] = useState();
  const [rowData, setRowData] = useState(getData());
  const [columnDefs, setColumnDefs] = useState([\
    { field: "name", headerName: "Athlete" },\
    { field: "medals.gold", headerName: "Gold Medals" },\
    { field: "person.age", headerName: "Age" },\
  ]);

  const onGridReady = useCallback((params) => {
    setGridApi(params.api);
  }, []);

  const onGridPreDestroyed = useCallback(
    (params) => {
      const allColumns = gridApi?.getColumns();
      if (!allColumns) {
        return;
      }

      const currentColumnWidths = allColumns.map((column) => ({
        field: column.getColDef().field || "-",
        width: column.getActualWidth(),
      }));

      setColumnsWidthOnPreDestroyed(currentColumnWidths);
      setGridApi(undefined);
    },
    [gridApi],
  );

  const updateColumnWidth = useCallback(() => {
    if (!gridApi) {
      return;
    }

    const newWidths = gridApi.getColumns().map((column) => {
      return {
        key: column.getColId(),
        newWidth: Math.round((150 + Math.random() * 100) * 100) / 100,
      };
    });
    gridApi.setColumnWidths(newWidths);
  }, [gridApi]);

  const destroyGrid = useCallback(() => {
    setGridVisible(false);
  }, []);

  const reloadGrid = useCallback(() => {
    const updatedColumnDefs = columnDefs.map((val) => {
      const colDef = val;
      const result = {
        ...colDef,
      };

      if (colDef.field) {
        const width = columnsWidthOnPreDestroyed.find(
          (columnWidth) => columnWidth.field === colDef.field,
        );
        result.width = width ? width.width : colDef.width;
      }

      return result;
    });

    setColumnsWidthOnPreDestroyed([]);
    setColumnDefs(updatedColumnDefs);
    setGridVisible(true);
  }, [columnsWidthOnPreDestroyed, columnDefs]);

  return (
    <div style={containerStyle}>
      <div className="test-container">
        <div className="test-header">
          {gridVisible && (
            <div id="exampleButtons" style={{ marginBottom: "1rem" }}>
              <button onClick={() => updateColumnWidth()}>
                Change Columns Width
              </button>
              <button onClick={() => destroyGrid()}>Destroy Grid</button>
            </div>
          )}
          {Array.isArray(columnsWidthOnPreDestroyed) &&
            columnsWidthOnPreDestroyed.length > 0 && (
              <div id="gridPreDestroyedState">
                State captured on grid pre-destroyed event:
                <br />
                <strong>Column fields and widths</strong>
                <div className="values">
                  <ul>
                    {columnsWidthOnPreDestroyed.map((columnWidth, index) => (
                      <li key={index}>
                        {columnWidth.field} : {columnWidth.width}px
                      </li>
                    ))}
                  </ul>
                </div>
                <button onClick={() => reloadGrid()}>Reload Grid</button>
              </div>
            )}
        </div>
        <div style={{ height: "100%", boxSizing: "border-box" }}>
          <div
            style={{
              height: "100%",
              width: "100%",
            }}
          >
            {gridVisible && (
              <AgGridReact
                columnDefs={columnDefs}
                rowData={rowData}
                onGridReady={onGridReady}
                onGridPreDestroyed={onGridPreDestroyed}
              />
            )}
          </div>
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
