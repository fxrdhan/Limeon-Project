The Loading Component is displayed for a row to show data is loading.

## Full Width Loading Row [Copy Link](https://www.ag-grid.com/react-data-grid/component-loading-cell-renderer/#full-width-loading-row)

The example below demonstrates replacing the Provided Loading Component with a Custom Loading Component.

- **Custom Loading Component** is supplied by name via `gridOptions.loadingCellRenderer`.
- **Custom Loading Component Parameters** are supplied using `gridOptions.loadingCellRendererParams`.
- Example simulates a long delay to display the spinner clearly.
- Scrolling the grid will request more rows and again display the loading cell renderer.

React Example - Component Loading Cell Renderer - Custom Loading Cell
Renderer

One moment please...

Hide filesViewing: index.jsx

- customLoadingCellRenderer.jsx
- index.jsx

Language:JavaScriptTypeScript

```jsx
("use client");

import React, { useCallback, useMemo, useState, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AgGridReact } from "ag-grid-react";
import {
  ModuleRegistry,
  NumberEditorModule,
  NumberFilterModule,
  TextEditorModule,
  TextFilterModule,
  ValidationModule,
} from "ag-grid-community";
import { ServerSideRowModelModule } from "ag-grid-enterprise";
import CustomLoadingCellRenderer from "./customLoadingCellRenderer.jsx";

ModuleRegistry.registerModules([\
  NumberEditorModule,\
  TextEditorModule,\
  TextFilterModule,\
  NumberFilterModule,\
  ServerSideRowModelModule,\
  ...(process.env.NODE_ENV !== "production" ? [ValidationModule] : []),\
]);

const getServerSideDatasource = (server) => {
  return {
    getRows: (params) => {
      // adding delay to simulate real server call
      setTimeout(() => {
        const response = server.getResponse(params.request);
        if (response.success) {
          // call the success callback
          params.success({
            rowData: response.rows,
            rowCount: response.lastRow,
          });
        } else {
          // inform the grid request failed
          params.fail();
        }
      }, 4000);
    },
  };
};

const getFakeServer = (allData) => {
  return {
    getResponse: (request) => {
      console.log(
        "asking for rows: " + request.startRow + " to " + request.endRow,
      );
      // take a slice of the total rows
      const rowsThisPage = allData.slice(request.startRow, request.endRow);
      // if on or after the last page, work out the last row.
      const lastRow =
        allData.length <= (request.endRow || 0) ? allData.length : -1;
      return {
        success: true,
        rows: rowsThisPage,
        lastRow: lastRow,
      };
    },
  };
};

const GridExample = () => {
  const containerStyle = useMemo(() => ({ width: "100%", height: "100%" }), []);
  const gridStyle = useMemo(() => ({ height: "100%", width: "100%" }), []);

  const [columnDefs, setColumnDefs] = useState([\
    { field: "id" },\
    { field: "athlete", width: 150 },\
    { field: "age" },\
    { field: "country" },\
    { field: "year" },\
    { field: "sport" },\
    { field: "gold" },\
    { field: "silver" },\
    { field: "bronze" },\
  ]);
  const defaultColDef = useMemo(() => {
    return {
      editable: true,
      flex: 1,
      minWidth: 100,
      filter: true,
    };
  }, []);
  const loadingCellRenderer = useCallback(CustomLoadingCellRenderer, []);
  const loadingCellRendererParams = useMemo(() => {
    return {
      loadingMessage: "One moment please...",
    };
  }, []);

  const onGridReady = useCallback((params) => {
    fetch("https://www.ag-grid.com/example-assets/olympic-winners.json")
      .then((resp) => resp.json())
      .then((data) => {
        // add id to data
        let idSequence = 0;
        data.forEach((item) => {
          item.id = idSequence++;
        });
        const server = getFakeServer(data);
        const datasource = getServerSideDatasource(server);
        params.api.setGridOption("serverSideDatasource", datasource);
      });
  }, []);

  return (
    <div style={containerStyle}>
      <div
        style={{ height: "100%", paddingTop: "25px", boxSizing: "border-box" }}
      >
        <div style={gridStyle}>
          <AgGridReact
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            loadingCellRenderer={loadingCellRenderer}
            loadingCellRendererParams={loadingCellRendererParams}
            rowModelType={"serverSide"}
            cacheBlockSize={20}
            maxBlocksInCache={10}
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

Console

Clear

```

Console logs from the example shown here...
```

### Custom Loading Row [Copy Link](https://www.ag-grid.com/react-data-grid/component-loading-cell-renderer/#custom-loading-row)

When a custom Loading Cell Renderer Component is instantiated within the the grid the following will be made available on `props`:

Properties available on the `CustomLoadingCellRendererProps<TData = any, TContext = any>` interface.

|                                                                                                                                                                                                                                                                                                     |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| node [Copy Link](https://www.ag-grid.com/react-data-grid/component-loading-cell-renderer/#reference-CustomLoadingCellRendererProps-node)<br>[IRowNode](https://www.ag-grid.com/react-data-grid/row-object/)<br>The row node.                                                                        |
| api [Copy Link](https://www.ag-grid.com/react-data-grid/component-loading-cell-renderer/#reference-CustomLoadingCellRendererProps-api)<br>[GridApi](https://www.ag-grid.com/react-data-grid/grid-api/)<br>The grid api.                                                                             |
| context [Copy Link](https://www.ag-grid.com/react-data-grid/component-loading-cell-renderer/#reference-CustomLoadingCellRendererProps-context)<br>[TContext](https://www.ag-grid.com/react-data-grid/typescript-generics/#context-tcontext)<br>Application context as set on `gridOptions.context`. |

### Failed Loading [Copy Link](https://www.ag-grid.com/react-data-grid/component-loading-cell-renderer/#failed-loading)

When using a Custom Loading Component, you can add handling for loading failures in the component directly.

In the example below, note that:

- **Custom Loading Component** is supplied by name via `gridOptions.loadingCellRenderer`.
- **Custom Loading Component Parameters** are supplied using `gridOptions.loadingCellRendererParams`.
- The example simulates a long delay to display the spinner clearly and simulates a loading failure.

Hide filesViewing: index.jsx

- customLoadingCellRenderer.jsx
- index.jsx

Language:JavaScriptTypeScript

```jsx
("use client");

import React, { useCallback, useMemo, useState, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AgGridReact } from "ag-grid-react";
import {
  ModuleRegistry,
  NumberEditorModule,
  NumberFilterModule,
  TextEditorModule,
  TextFilterModule,
  ValidationModule,
} from "ag-grid-community";
import { ServerSideRowModelModule } from "ag-grid-enterprise";
import CustomLoadingCellRenderer from "./customLoadingCellRenderer.jsx";

ModuleRegistry.registerModules([\
  NumberEditorModule,\
  TextEditorModule,\
  TextFilterModule,\
  NumberFilterModule,\
  ServerSideRowModelModule,\
  ...(process.env.NODE_ENV !== "production" ? [ValidationModule] : []),\
]);

const getServerSideDatasource = (server) => {
  return {
    getRows: (params) => {
      // adding delay to simulate real server call
      setTimeout(() => {
        // Fail loading to display failed loading cell renderer
        params.fail();
      }, 4000);
    },
  };
};

const getFakeServer = (allData) => {
  return {
    getResponse: (request) => {
      console.log(
        "asking for rows: " + request.startRow + " to " + request.endRow,
      );
      // take a slice of the total rows
      const rowsThisPage = allData.slice(request.startRow, request.endRow);
      // if on or after the last page, work out the last row.
      const lastRow =
        allData.length <= (request.endRow || 0) ? allData.length : -1;
      return {
        success: true,
        rows: rowsThisPage,
        lastRow: lastRow,
      };
    },
  };
};

const GridExample = () => {
  const containerStyle = useMemo(() => ({ width: "100%", height: "100%" }), []);
  const gridStyle = useMemo(() => ({ height: "100%", width: "100%" }), []);

  const [columnDefs, setColumnDefs] = useState([\
    { field: "id" },\
    { field: "athlete", width: 150 },\
    { field: "age" },\
    { field: "country" },\
    { field: "year" },\
    { field: "sport" },\
    { field: "gold" },\
    { field: "silver" },\
    { field: "bronze" },\
  ]);
  const defaultColDef = useMemo(() => {
    return {
      editable: true,
      flex: 1,
      minWidth: 100,
      filter: true,
    };
  }, []);
  const loadingCellRenderer = useCallback(CustomLoadingCellRenderer, []);
  const loadingCellRendererParams = useMemo(() => {
    return {
      loadingMessage: "One moment please...",
    };
  }, []);

  const onGridReady = useCallback((params) => {
    fetch("https://www.ag-grid.com/example-assets/olympic-winners.json")
      .then((resp) => resp.json())
      .then((data) => {
        // add id to data
        let idSequence = 0;
        data.forEach((item) => {
          item.id = idSequence++;
        });
        const server = getFakeServer(data);
        const datasource = getServerSideDatasource(server);
        params.api.setGridOption("serverSideDatasource", datasource);
      });
  }, []);

  return (
    <div style={containerStyle}>
      <div
        style={{ height: "100%", paddingTop: "25px", boxSizing: "border-box" }}
      >
        <div style={gridStyle}>
          <AgGridReact
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            loadingCellRenderer={loadingCellRenderer}
            loadingCellRendererParams={loadingCellRendererParams}
            rowModelType={"serverSide"}
            cacheBlockSize={10}
            serverSideInitialRowCount={10}
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

Console

Clear

```

Console logs from the example shown here...
```

### Dynamic Loading Row Selection [Copy Link](https://www.ag-grid.com/react-data-grid/component-loading-cell-renderer/#dynamic-loading-row-selection)

It's possible to determine what Loading Cell Renderer to use dynamically - i.e. at runtime. This requires providing a `loadingCellRendererSelector`.

```ts
loadingCellRendererSelector: (params) => {
    const useCustomRenderer = ...some condition/check...
    if (useCustomRenderer) {
        return {
            component: CustomLoadingCellRenderer,
            params: {
                // parameters to supply to the custom loading cell renderer
                loadingMessage: '--- CUSTOM LOADING MESSAGE ---',
            },
        };
        } else {
            // no loading cell renderer
            return undefined;
        }
    }
}

```

## Skeleton Loading [Copy Link](https://www.ag-grid.com/react-data-grid/component-loading-cell-renderer/#skeleton-loading)

The grid can be configured to instead display loading indicators in cells, by enabling `suppressServerSideFullWidthLoadingRow`.

Hide filesViewing: index.jsx

- index.jsx

Language:JavaScriptTypeScript

```jsx
("use client");

import React, { useCallback, useMemo, useState, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, ValidationModule } from "ag-grid-community";
import {
  RowGroupingModule,
  ServerSideRowModelModule,
} from "ag-grid-enterprise";

ModuleRegistry.registerModules([\
  ServerSideRowModelModule,\
  RowGroupingModule,\
  ...(process.env.NODE_ENV !== "production" ? [ValidationModule] : []),\
]);

const getServerSideDatasource = (server) => {
  return {
    getRows: (params) => {
      // adding delay to simulate real server call
      setTimeout(() => {
        const response = server.getResponse(params.request);
        if (response.success) {
          // call the success callback
          params.success({
            rowData: response.rows,
            rowCount: response.lastRow,
          });
        } else {
          // inform the grid request failed
          params.fail();
        }
      }, 4000);
    },
  };
};

const getFakeServer = (allData) => {
  return {
    getResponse: (request) => {
      console.log(
        "[Datasource] asking for rows: " +
          request.startRow +
          " to " +
          request.endRow,
      );
      // take a slice of the total rows
      const rowsThisPage = allData.slice(request.startRow, request.endRow);
      const lastRow = allData.length;
      return {
        success: true,
        rows: rowsThisPage,
        lastRow: lastRow,
      };
    },
  };
};

const GridExample = () => {
  const containerStyle = useMemo(() => ({ width: "100%", height: "100%" }), []);
  const gridStyle = useMemo(() => ({ height: "100%", width: "100%" }), []);

  const [columnDefs, setColumnDefs] = useState([\
    { field: "country", flex: 4 },\
    { field: "sport", flex: 4 },\
    { field: "year", flex: 3 },\
    { field: "gold", aggFunc: "sum", flex: 2 },\
    { field: "silver", aggFunc: "sum", flex: 2 },\
    { field: "bronze", aggFunc: "sum", flex: 2 },\
  ]);
  const defaultColDef = useMemo(() => {
    return {
      minWidth: 75,
    };
  }, []);

  const onGridReady = useCallback((params) => {
    fetch("https://www.ag-grid.com/example-assets/olympic-winners.json")
      .then((resp) => resp.json())
      .then((data) => {
        // add id to data
        let idSequence = 0;
        data.forEach((item) => {
          item.id = idSequence++;
        });
        const server = getFakeServer(data);
        const datasource = getServerSideDatasource(server);
        params.api.setGridOption("serverSideDatasource", datasource);
      });
  }, []);

  return (
    <div style={containerStyle}>
      <div style={gridStyle}>
        <AgGridReact
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          rowModelType={"serverSide"}
          suppressServerSideFullWidthLoadingRow={true}
          cacheBlockSize={5}
          maxBlocksInCache={0}
          rowBuffer={0}
          maxConcurrentDatasourceRequests={1}
          blockLoadDebounceMillis={200}
          onGridReady={onGridReady}
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

Console logs from the example shown here...
```

```jsx
const gridOptions = {
  suppressServerSideFullWidthLoadingRow: true,
};
```

### Custom Loading Cells [Copy Link](https://www.ag-grid.com/react-data-grid/component-loading-cell-renderer/#custom-loading-cells)

The default grid behaviour can be overridden in order to provide renderers on a per-column basis.

Hide filesViewing: index.jsx

- customLoadingCellRenderer.jsx
- index.jsx

Language:JavaScriptTypeScript

```jsx
("use client");

import React, { useCallback, useMemo, useState, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, ValidationModule } from "ag-grid-community";
import {
  RowGroupingModule,
  ServerSideRowModelModule,
} from "ag-grid-enterprise";
import CustomLoadingCellRenderer from "./customLoadingCellRenderer.jsx";

ModuleRegistry.registerModules([\
  ServerSideRowModelModule,\
  RowGroupingModule,\
  ...(process.env.NODE_ENV !== "production" ? [ValidationModule] : []),\
]);

const getServerSideDatasource = (server) => {
  return {
    getRows: (params) => {
      // adding delay to simulate real server call
      setTimeout(() => {
        const response = server.getResponse(params.request);
        if (response.success) {
          // call the success callback
          params.success({
            rowData: response.rows,
            rowCount: response.lastRow,
          });
        } else {
          // inform the grid request failed
          params.fail();
        }
      }, 1000);
    },
  };
};

const getFakeServer = (allData) => {
  return {
    getResponse: (request) => {
      console.log(
        "asking for rows: " + request.startRow + " to " + request.endRow,
      );
      // take a slice of the total rows
      const rowsThisPage = allData.slice(request.startRow, request.endRow);
      const lastRow = allData.length;
      return {
        success: true,
        rows: rowsThisPage,
        lastRow: lastRow,
      };
    },
  };
};

const GridExample = () => {
  const containerStyle = useMemo(() => ({ width: "100%", height: "100%" }), []);
  const gridStyle = useMemo(() => ({ height: "100%", width: "100%" }), []);

  const [columnDefs, setColumnDefs] = useState([\
    {\
      field: "country",\
      flex: 4,\
      loadingCellRenderer: CustomLoadingCellRenderer,\
    },\
    { field: "sport", flex: 4 },\
    { field: "year", flex: 3 },\
    { field: "gold", aggFunc: "sum", flex: 2 },\
    { field: "silver", aggFunc: "sum", flex: 2 },\
    { field: "bronze", aggFunc: "sum", flex: 2 },\
  ]);
  const defaultColDef = useMemo(() => {
    return {
      loadingCellRenderer: () => "",
      minWidth: 75,
    };
  }, []);

  const onGridReady = useCallback((params) => {
    fetch("https://www.ag-grid.com/example-assets/olympic-winners.json")
      .then((resp) => resp.json())
      .then((data) => {
        // add id to data
        let idSequence = 0;
        data.forEach((item) => {
          item.id = idSequence++;
        });
        const server = getFakeServer(data);
        const datasource = getServerSideDatasource(server);
        params.api.setGridOption("serverSideDatasource", datasource);
      });
  }, []);

  return (
    <div style={containerStyle}>
      <div style={gridStyle}>
        <AgGridReact
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          rowModelType={"serverSide"}
          cacheBlockSize={5}
          maxBlocksInCache={0}
          rowBuffer={0}
          maxConcurrentDatasourceRequests={1}
          blockLoadDebounceMillis={200}
          suppressServerSideFullWidthLoadingRow={true}
          onGridReady={onGridReady}
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

Console logs from the example shown here...
```

```jsx
const gridOptions = {
    suppressServerSideFullWidthLoadingRow: true,
    columnDefs: [\
        { field: 'athlete', loadingCellRenderer: CustomLoadingCellRenderer },\
        // More columns, with no load renderer...\
    ],
    defaultColDef: {
        loadingCellRenderer: () => '',
    },
};

```

The above example demonstrates the following:

- `suppressServerSideFullWidthLoadingRow` is enabled, preventing the grid from defaulting to full width loading.
- `loadingCellRenderer` is configured on the _Athlete_ column, allowing a loading spinner to be displayed for just this column.
- `loadingCellRenderer` is configured on the `defaultColDef` providing an empty cell renderer in order to prevent the default grid loading renderer from displaying on other columns.
