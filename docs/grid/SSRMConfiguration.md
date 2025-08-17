This section covers the Server-Side Cache and configurations available in the Server-Side Row Model.

As many of the configurations available in the Server-Side Row Model relate to the Server-Side Cache it is important to understand how the grid organises data obtained from the server into caches.

## Server-Side Cache [Copy Link](https://www.ag-grid.com/react-data-grid/server-side-model-configuration/#server-side-cache)

The grid arranges rows into blocks which are in turn stored in a cache as illustrated below:

![serverSideCache](https://www.ag-grid.com/_astro/serverSideCache.BdouedRv.png)

Fig 1. Server-side Cache

There is a cache containing the top-level rows (i.e. on the root node) and for each individual [Row Grouping](https://www.ag-grid.com/react-data-grid/server-side-model-grouping/) level. When the grid initialises, it will retrieve an initial number (as per configuration) of blocks containing rows, and as the user scrolls down more blocks will be loaded.

Several [Configurations](https://www.ag-grid.com/react-data-grid/server-side-model-api-reference/), such as `cacheBlockSize` and `maxBlocksInCache`, are expressed in terms of the Server-Side Cache.

The example below demonstrates some configurations. Note the following:

- The grid property `cacheBlockSize = 50`. This sets the block size to 50, thus rows are read back 50 at a time.
- The grid property `maxBlocksInCache = 2`. This means the grid will keep two blocks in memory only. To see this in action, scroll past row 100 (which will require a third block to be loaded), then quickly scroll back to the start and you will observe the first block needs to be reloaded.

React Example - Server Side Model Configuration - Cache Configurations

Id

Athlete

Country

Hide filesViewing: index.jsx

- index.jsx

Language:JavaScriptTypeScript

```jsx
("use client");

import React, { useCallback, useMemo, useState, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, ValidationModule } from "ag-grid-community";
import { ServerSideRowModelModule } from "ag-grid-enterprise";

ModuleRegistry.registerModules([\
  ServerSideRowModelModule,\
  ...(process.env.NODE_ENV !== "production" ? [ValidationModule] : []),\
]);

const createServerSideDatasource = (server) => {
  return {
    getRows: (params) => {
      console.log("[Datasource] - rows requested by grid: ", params.request);
      // get data for request from our fake server
      const response = server.getData(params.request);
      // simulating real server call with a 500ms delay
      setTimeout(() => {
        if (response.success) {
          // supply rows for requested block to grid
          params.success({
            rowData: response.rows,
            rowCount: response.lastRow,
          });
        } else {
          params.fail();
        }
      }, 500);
    },
  };
};

function createFakeServer(allData) {
  return {
    getData: (request) => {
      // take a slice of the total rows for requested block
      const rowsForBlock = allData.slice(request.startRow, request.endRow);
      // here we are pretending we don't know the last row until we reach it!
      const lastRow = getLastRowIndex(request, rowsForBlock);
      return {
        success: true,
        rows: rowsForBlock,
        lastRow: lastRow,
      };
    },
  };
}

function getLastRowIndex(request, results) {
  if (!results) return undefined;
  const currentLastRow = (request.startRow || 0) + results.length;
  // if on or after the last block, work out the last row, otherwise return 'undefined'
  return currentLastRow < (request.endRow || 0) ? currentLastRow : undefined;
}

const GridExample = () => {
  const containerStyle = useMemo(() => ({ width: "100%", height: "100%" }), []);
  const gridStyle = useMemo(() => ({ height: "100%", width: "100%" }), []);

  const [columnDefs, setColumnDefs] = useState([\
    { field: "id", maxWidth: 80 },\
    { field: "athlete", minWidth: 220 },\
    { field: "country", minWidth: 200 },\
    { field: "year" },\
    { field: "sport", minWidth: 200 },\
    { field: "gold" },\
    { field: "silver" },\
    { field: "bronze" },\
  ]);
  const defaultColDef = useMemo(() => {
    return {
      flex: 1,
      minWidth: 100,
      sortable: false,
    };
  }, []);

  const onGridReady = useCallback((params) => {
    fetch("https://www.ag-grid.com/example-assets/olympic-winners.json")
      .then((resp) => resp.json())
      .then((data) => {
        // adding row id to data
        let idSequence = 0;
        data.forEach(function (item) {
          item.id = idSequence++;
        });
        // setup the fake server with entire dataset
        const fakeServer = createFakeServer(data);
        // create datasource with a reference to the fake server
        const datasource = createServerSideDatasource(fakeServer);
        // register the datasource with the grid
        params.api.setGridOption("serverSideDatasource", datasource);
      });
  }, []);

  return (
    <div style={containerStyle}>
      <div style={gridStyle}>
        <AgGridReact
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          rowBuffer={0}
          rowModelType={"serverSide"}
          cacheBlockSize={50}
          maxBlocksInCache={2}
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

## Block Loading Debounce [Copy Link](https://www.ag-grid.com/react-data-grid/server-side-model-configuration/#block-loading-debounce)

It may be desirable to scroll through the entire dataset without the need for intermediate blocks to be loaded.

The example below shows how debouncing block loading can be achieved. Note the following:

- The response from the server sets the `rowCount` property so that the vertical scrollbars bounds are set such that the entire dataset can be scrolled through.

- `blockLoadDebounceMillis = 1000` \- loading of blocks is delayed by `1000ms`. This allows for skipping over blocks when scrolling to advanced positions.

- The grid property `debug = true`. This means the browser's dev console will show loading block details.

React Example - Server Side Model Configuration - Block Load Debounce

Id

Athlete

Country

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
  ColumnMenuModule,
  ColumnsToolPanelModule,
  ContextMenuModule,
  ServerSideRowModelModule,
} from "ag-grid-enterprise";

ModuleRegistry.registerModules([\
  ColumnsToolPanelModule,\
  ColumnMenuModule,\
  ContextMenuModule,\
  ServerSideRowModelModule,\
  ...(process.env.NODE_ENV !== "production" ? [ValidationModule] : []),\
]);

const createServerSideDatasource = (server) => {
  return {
    getRows: (params) => {
      console.log("[Datasource] - rows requested by grid: ", params.request);
      // get data for request from our fake server
      const response = server.getData(params.request);
      // simulating real server call with a 100ms delay
      setTimeout(() => {
        if (response.success) {
          // supply rows for requested block to grid
          params.success({
            rowData: response.rows,
            rowCount: response.lastRow,
          });
        } else {
          params.fail();
        }
      }, 100);
    },
  };
};

function createFakeServer(allData) {
  return {
    getData: (request) => {
      // take a slice of the total rows for requested block
      const rowsForBlock = allData.slice(request.startRow, request.endRow);
      // when row count is known and 'blockLoadDebounceMillis' is set it is possible to
      // quickly skip over blocks while scrolling
      const lastRow = allData.length;
      return {
        success: true,
        rows: rowsForBlock,
        lastRow: lastRow,
      };
    },
  };
}

const GridExample = () => {
  const containerStyle = useMemo(() => ({ width: "100%", height: "100%" }), []);
  const gridStyle = useMemo(() => ({ height: "100%", width: "100%" }), []);

  const [columnDefs, setColumnDefs] = useState([\
    { field: "id", maxWidth: 80 },\
    { field: "athlete", minWidth: 220 },\
    { field: "country", minWidth: 200 },\
    { field: "year" },\
    { field: "sport", minWidth: 200 },\
    { field: "gold" },\
    { field: "silver" },\
    { field: "bronze" },\
  ]);
  const defaultColDef = useMemo(() => {
    return {
      flex: 1,
      minWidth: 100,
      sortable: false,
    };
  }, []);

  const onGridReady = useCallback((params) => {
    fetch("https://www.ag-grid.com/example-assets/olympic-winners.json")
      .then((resp) => resp.json())
      .then((data) => {
        // adding row id to data
        let idSequence = 0;
        data.forEach(function (item) {
          item.id = idSequence++;
        });
        // setup the fake server with entire dataset
        const fakeServer = createFakeServer(data);
        // create datasource with a reference to the fake server
        const datasource = createServerSideDatasource(fakeServer);
        // register the datasource with the grid
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
          blockLoadDebounceMillis={1000}
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

## Providing Additional Data [Copy Link](https://www.ag-grid.com/react-data-grid/server-side-model-configuration/#providing-additional-data)

It is possible to supply extra data to the grid outside of the datasource lifecycle. This can be used to populate the grid with data before scrolling, provide hierarchical data, or provide additional blocks.

|                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| applyServerSideRowData [Copy Link](https://www.ag-grid.com/react-data-grid/server-side-model-configuration/#reference-serverSideRowModel-applyServerSideRowData)<br>Function<br>Applies row data to a server side store.<br>New rows will overwrite rows at the same index in the same way as if provided by a datasource success callback.<br>[ServerSideRowModelApiModule](https://www.ag-grid.com/react-data-grid/modules/) |

The example below demonstrates that the grid can be populated with data outside of the datasource flow. Note the following:

- The first loading row never displays, as the first 100 rows are loaded by default
- 100 rows are provided by default, ignoring the `cacheBlockSize` property
- The loading of these additional rows bypasses the `blockLoadDebounceMillis` and `maxConcurrentDatasourceRequests` properties.

React Example - Server Side Model Configuration - Additional Row Data

Index

Athlete

Country

Year

Sport

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
  ServerSideRowModelApiModule,
  ServerSideRowModelModule,
} from "ag-grid-enterprise";

ModuleRegistry.registerModules([\
  ServerSideRowModelModule,\
  ServerSideRowModelApiModule,\
  ...(process.env.NODE_ENV !== "production" ? [ValidationModule] : []),\
]);

const createServerSideDatasource = (server) => {
  return {
    getRows: (params) => {
      console.log(
        "[Datasource] - rows requested by grid: startRow = " +
          params.request.startRow +
          ", endRow = " +
          params.request.endRow,
      );
      // get data for request from our fake server
      const response = server.getData(params.request);
      // simulating real server call with a 1000ms delay
      setTimeout(() => {
        if (response.success) {
          // supply rows for requested block to grid
          params.success({
            rowData: response.rows,
            rowCount: response.lastRow,
          });
        } else {
          params.fail();
        }
      }, 1000);
    },
  };
};

function createFakeServer(allData) {
  return {
    getData: (request) => {
      // in this simplified fake server all rows are contained in an array
      const requestedRows = allData.slice(request.startRow, request.endRow);
      return {
        success: true,
        rows: requestedRows,
        lastRow: allData.length,
      };
    },
  };
}

const GridExample = () => {
  const containerStyle = useMemo(() => ({ width: "100%", height: "100%" }), []);
  const gridStyle = useMemo(() => ({ height: "100%", width: "100%" }), []);

  const [columnDefs, setColumnDefs] = useState([\
    { headerName: "Index", valueGetter: "node.rowIndex", minWidth: 100 },\
    { field: "athlete", minWidth: 150 },\
    { field: "country", minWidth: 150 },\
    { field: "year" },\
    { field: "sport", minWidth: 120 },\
    { field: "gold" },\
    { field: "silver" },\
    { field: "bronze" },\
  ]);
  const defaultColDef = useMemo(() => {
    return {
      flex: 1,
      minWidth: 80,
      sortable: false,
    };
  }, []);

  const onGridReady = useCallback((params) => {
    fetch("https://www.ag-grid.com/example-assets/olympic-winners.json")
      .then((resp) => resp.json())
      .then((data) => {
        // setup the fake server with entire dataset
        const fakeServer = createFakeServer(data);
        // create datasource with a reference to the fake server
        const datasource = createServerSideDatasource(fakeServer);
        // register the datasource with the grid
        params.api.setGridOption("serverSideDatasource", datasource);
        const initialData = fakeServer.getData({
          startRow: 0,
          endRow: 100,
        });
        params.api.applyServerSideRowData({
          successParams: {
            rowData: initialData.rows,
            rowCount: initialData.lastRow,
          },
        });
      });
  }, []);

  return (
    <div style={containerStyle}>
      <div style={gridStyle}>
        <AgGridReact
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          rowModelType={"serverSide"}
          maxBlocksInCache={0}
          cacheBlockSize={50}
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

## Initial Scroll Position [Copy Link](https://www.ag-grid.com/react-data-grid/server-side-model-configuration/#initial-scroll-position)

When using the server-side row model the initial scroll position of the grid can be set. This is achieved by calling `api.ensureIndexVisible()` after setting the data source to the grid.

It is important that the `serverSideInitialRowCount` property is set to a value that is greater than the sum of the row index provided to `api.ensureIndexVisible()` and the number of rows displayed in the grid's viewport.

This is demonstrated in the example below, note the following:

- The `serverSideInitialRowCount` property has been set to provide an initial length to the vertical scrollbars.

- After the datasource has been set `api.ensureIndexVisible(5000, 'top')` is called, causing the grid to scroll down to row `5000`.

React Example - Server Side Model Configuration - Initial Scroll Position

Hide filesViewing: index.jsx

- index.jsx

Language:JavaScriptTypeScript

```jsx
("use client");

import React, { useCallback, useMemo, useState, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AgGridReact } from "ag-grid-react";
import {
  ModuleRegistry,
  ScrollApiModule,
  ValidationModule,
} from "ag-grid-community";
import {
  ColumnMenuModule,
  ColumnsToolPanelModule,
  ContextMenuModule,
  ServerSideRowModelModule,
} from "ag-grid-enterprise";

ModuleRegistry.registerModules([\
  ScrollApiModule,\
  ColumnsToolPanelModule,\
  ColumnMenuModule,\
  ContextMenuModule,\
  ServerSideRowModelModule,\
  ...(process.env.NODE_ENV !== "production" ? [ValidationModule] : []),\
]);

const createServerSideDatasource = (server) => {
  return {
    getRows: (params) => {
      console.log(
        "[Datasource] - rows requested by grid: startRow = " +
          params.request.startRow +
          ", endRow = " +
          params.request.endRow,
      );
      // get data for request from our fake server
      const response = server.getData(params.request);
      // simulating real server call with a 1000ms delay
      setTimeout(() => {
        if (response.success) {
          // supply rows for requested block to grid
          params.success({
            rowData: response.rows,
            rowCount: response.lastRow,
          });
        } else {
          params.fail();
        }
      }, 1000);
    },
  };
};

function createFakeServer(allData) {
  return {
    getData: (request) => {
      // in this simplified fake server all rows are contained in an array
      const requestedRows = allData.slice(request.startRow, request.endRow);
      return {
        success: true,
        rows: requestedRows,
        lastRow: allData.length,
      };
    },
  };
}

const GridExample = () => {
  const containerStyle = useMemo(() => ({ width: "100%", height: "100%" }), []);
  const gridStyle = useMemo(() => ({ height: "100%", width: "100%" }), []);

  const [columnDefs, setColumnDefs] = useState([\
    { headerName: "Index", valueGetter: "node.rowIndex", minWidth: 100 },\
    { field: "athlete", minWidth: 150 },\
    { field: "country", minWidth: 150 },\
    { field: "year" },\
    { field: "sport", minWidth: 120 },\
    { field: "gold" },\
    { field: "silver" },\
    { field: "bronze" },\
  ]);
  const defaultColDef = useMemo(() => {
    return {
      flex: 1,
      minWidth: 80,
      sortable: false,
    };
  }, []);

  const onGridReady = useCallback((params) => {
    fetch("https://www.ag-grid.com/example-assets/olympic-winners.json")
      .then((resp) => resp.json())
      .then((data) => {
        // setup the fake server with entire dataset
        const fakeServer = createFakeServer(data);
        // create datasource with a reference to the fake server
        const datasource = createServerSideDatasource(fakeServer);
        // register the datasource with the grid
        params.api.setGridOption("serverSideDatasource", datasource);
        // scroll the grid down until row 5000 is at the top of the viewport
        params.api.ensureIndexVisible(5000, "top");
      });
  }, []);

  return (
    <div style={containerStyle}>
      <div style={gridStyle}>
        <AgGridReact
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          rowModelType={"serverSide"}
          serverSideInitialRowCount={5500}
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

## Providing Row IDs [Copy Link](https://www.ag-grid.com/react-data-grid/server-side-model-configuration/#providing-row-ids)

Some features of the server-side row model require Row IDs in order to be enabled or to enhance their behaviour, these features include [Row Selection](https://www.ag-grid.com/react-data-grid/server-side-model-selection/), [Transactions](https://www.ag-grid.com/react-data-grid/server-side-model-updating-transactions/) and [Refreshing Data](https://www.ag-grid.com/react-data-grid/server-side-model-updating-refresh/).

The server-side row model requires unique Row IDs in order to identify rows after new data loads. For example, if a sort or filter is applied which results in new rows being loaded, the grid needs to be able to identify the previously known rows.

Row IDs are provided by the application using the `getRowId()` callback:

|                                                                                                                                                                                                                                                                                                                                                                                                     |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| getRowId [Copy Link](https://www.ag-grid.com/react-data-grid/server-side-model-configuration/#reference-rowModels-getRowId)<br>GetRowIdFunc<br>[Initial](https://www.ag-grid.com/react-data-grid/grid-interface/#initial-grid-options)<br>Provide a pure function that returns a string ID to uniquely identify a given row. This enables the grid to work optimally with data changes and updates. |

When implementing `getRowId()` you must ensure the rows have unique Row IDs across the entire data set. Using an ID that is provided in the data such as a database Primary Key is recommended.

### Supplying Unique Group IDs [Copy Link](https://www.ag-grid.com/react-data-grid/server-side-model-configuration/#supplying-unique-group-ids)

When grouping there may not be an easy way to get unique Row IDs from the data for group levels. This is because a group row doesn't always correspond to one Row in the store.

To handle this scenario, the grid provides `parentKeys` and `level` properties in the `GetRowIdParams` supplied to `getRowId()`.

These can be used to create unique group IDs as shown below:

```jsx
const getRowId = useCallback(params => {
  const parentKeysJoined = (params.parentKeys || []).join('-');
  if (params.data.id != null) {
    return parentKeysJoined + params.data.id;
  }
  const rowGroupCols = params.api.getRowGroupColumns();
  const thisGroupCol = rowGroupCols[params.level];
  return parentKeysJoined + params.data[thisGroupCol.getColDef().field];
}, []);

<AgGridReact getRowId={getRowId} />;
```

## Debug Info [Copy Link](https://www.ag-grid.com/react-data-grid/server-side-model-configuration/#debug-info)

When using the server-side row model it can be helpful to gather the state of each block. This can be gathered by using `api.getCacheBlockState()` or alternatively you can enable `debug: true` in the grid properties to see this output logged to the console whenever blocks are loaded.

In the example below, note the following:

- The grid option `debug: true` has been enabled
- When scrolling through the grid, block information is logged to the console

React Example - Server Side Model Configuration - Cache Block State

Id

Athlete

Country

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
  ColumnMenuModule,
  ColumnsToolPanelModule,
  ContextMenuModule,
  ServerSideRowModelModule,
} from "ag-grid-enterprise";

ModuleRegistry.registerModules([\
  ColumnsToolPanelModule,\
  ColumnMenuModule,\
  ContextMenuModule,\
  ServerSideRowModelModule,\
  ...(process.env.NODE_ENV !== "production" ? [ValidationModule] : []),\
]);

const createServerSideDatasource = (server) => {
  return {
    getRows: (params) => {
      console.log("[Datasource] - rows requested by grid: ", params.request);
      // get data for request from our fake server
      const response = server.getData(params.request);
      // simulating real server call with a 500ms delay
      setTimeout(() => {
        if (response.success) {
          // supply rows for requested block to grid
          params.success({
            rowData: response.rows,
            rowCount: response.lastRow,
          });
        } else {
          params.fail();
        }
      }, 500);
    },
  };
};

function createFakeServer(allData) {
  return {
    getData: (request) => {
      // take a slice of the total rows for requested block
      const rowsForBlock = allData.slice(request.startRow, request.endRow);
      // here we are pretending we don't know the last row until we reach it!
      const lastRow = getLastRowIndex(request, rowsForBlock);
      return {
        success: true,
        rows: rowsForBlock,
        lastRow: lastRow,
      };
    },
  };
}

function getLastRowIndex(request, results) {
  if (!results) return undefined;
  const currentLastRow = (request.startRow || 0) + results.length;
  // if on or after the last block, work out the last row, otherwise return 'undefined'
  return currentLastRow < (request.endRow || 0) ? currentLastRow : undefined;
}

const GridExample = () => {
  const containerStyle = useMemo(() => ({ width: "100%", height: "100%" }), []);
  const gridStyle = useMemo(() => ({ height: "100%", width: "100%" }), []);

  const [columnDefs, setColumnDefs] = useState([\
    { field: "id", maxWidth: 80 },\
    { field: "athlete", minWidth: 220 },\
    { field: "country", minWidth: 200 },\
    { field: "year" },\
    { field: "sport", minWidth: 200 },\
    { field: "gold" },\
    { field: "silver" },\
    { field: "bronze" },\
  ]);
  const defaultColDef = useMemo(() => {
    return {
      flex: 1,
      minWidth: 100,
      sortable: false,
    };
  }, []);

  const onGridReady = useCallback((params) => {
    fetch("https://www.ag-grid.com/example-assets/olympic-winners.json")
      .then((resp) => resp.json())
      .then((data) => {
        // adding row id to data
        let idSequence = 0;
        data.forEach(function (item) {
          item.id = idSequence++;
        });
        // setup the fake server with entire dataset
        const fakeServer = createFakeServer(data);
        // create datasource with a reference to the fake server
        const datasource = createServerSideDatasource(fakeServer);
        // register the datasource with the grid
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
          maxBlocksInCache={2}
          debug={true}
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
