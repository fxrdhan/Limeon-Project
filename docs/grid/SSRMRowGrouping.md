This section covers Row Grouping in the Server-Side Row Model (SSRM).

## Enabling Row Grouping [Copy Link](https://www.ag-grid.com/react-data-grid/server-side-model-grouping/#enabling-row-grouping)

Row Grouping is enabled in the grid via the `rowGroup` column definition attribute. The example below shows how to group rows by 'country':

```jsx
const [columnDefs, setColumnDefs] = useState([\
    { field: 'country', rowGroup: true },\
    { field: 'sport' },\
    { field: 'year' },\
]);

<AgGridReact columnDefs={columnDefs} />
```

For more configuration details see the section on [Row Grouping](https://www.ag-grid.com/react-data-grid/grouping/).

## Server Side Row Grouping [Copy Link](https://www.ag-grid.com/react-data-grid/server-side-model-grouping/#server-side-row-grouping)

The actual grouping of rows is performed on the server when using the SSRM. When the grid needs more rows it makes a request via `getRows(params)` on the [Server-Side Datasource](https://www.ag-grid.com/react-data-grid/server-side-model-datasource/) with metadata containing grouping details.

The properties relevant to Row Grouping in the request are shown below:

```ts
// IServerSideGetRowsRequest
{
    // row group columns
    rowGroupCols: ColumnVO[];

    // what groups the user is viewing
    groupKeys: string[];

    ... // other params
}

```

Note in the snippet above the property `rowGroupCols` contains all the columns (dimensions) the grid is grouping on, e.g. 'Country', 'Year'. The property `groupKeys` contains the list of group keys selected, e.g. `['Argentina', '2012']`.

The example below demonstrates server-side Row Grouping. Note the following:

- **Country** and **Sport** columns have `rowGroup=true` defined on their column definitions. This tells the grid there are two levels of grouping, one for Country and one for Sport.
- The `rowGroupCols` and `groupKeys` properties in the request are used by the server to perform grouping.
- Open the browser's dev console to view the request supplied to the datasource.

React Example - Server Side Model Grouping - Row Grouping

Group

Year

sum(Gold)

Loading

Hide filesViewing: index.jsx

- fakeServer.jsx
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
import { FakeServer } from "./fakeServer";

ModuleRegistry.registerModules([\
  RowGroupingModule,\
  ServerSideRowModelModule,\
  ...(process.env.NODE_ENV !== "production" ? [ValidationModule] : []),\
]);

const getServerSideDatasource = (server) => {
  return {
    getRows: (params) => {
      console.log("[Datasource] - rows requested by grid: ", params.request);
      const response = server.getData(params.request);
      // adding delay to simulate real server call
      setTimeout(() => {
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

const GridExample = () => {
  const containerStyle = useMemo(() => ({ width: "100%", height: "100%" }), []);
  const gridStyle = useMemo(() => ({ height: "100%", width: "100%" }), []);

  const [columnDefs, setColumnDefs] = useState([\
    { field: "country", rowGroup: true, hide: true },\
    { field: "sport", rowGroup: true, hide: true },\
    { field: "year", minWidth: 100 },\
    { field: "gold", aggFunc: "sum", enableValue: true },\
    { field: "silver", aggFunc: "sum", enableValue: true },\
    { field: "bronze", aggFunc: "sum", enableValue: true },\
  ]);
  const defaultColDef = useMemo(() => {
    return {
      flex: 1,
      minWidth: 120,
    };
  }, []);
  const autoGroupColumnDef = useMemo(() => {
    return {
      flex: 1,
      minWidth: 280,
      field: "athlete",
    };
  }, []);

  const onGridReady = useCallback((params) => {
    fetch("https://www.ag-grid.com/example-assets/olympic-winners.json")
      .then((resp) => resp.json())
      .then((data) => {
        // setup the fake server with entire dataset
        const fakeServer = new FakeServer(data);
        // create datasource with a reference to the fake server
        const datasource = getServerSideDatasource(fakeServer);
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
          autoGroupColumnDef={autoGroupColumnDef}
          rowModelType={"serverSide"}
          cacheBlockSize={5}
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

## Open by Default [Copy Link](https://www.ag-grid.com/react-data-grid/server-side-model-grouping/#open-by-default)

It is possible to have rows open as soon as they are loaded. To do this implement the grid callback `isServerSideGroupOpenByDefault`.

|                                                                                                                                                                                                                                                                                                                 |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| isServerSideGroupOpenByDefault [Copy Link](https://www.ag-grid.com/react-data-grid/server-side-model-grouping/#reference-serverSideRowModel-isServerSideGroupOpenByDefault)<br>Function<br>Allows groups to be open by default.<br>[ServerSideRowModelModule](https://www.ag-grid.com/react-data-grid/modules/) |

```js
// Example implementation
function isServerSideGroupOpenByDefault(params) {
  var rowNode = params.rowNode;
  var isZimbabwe = rowNode.field == 'country' && rowNode.key == 'Zimbabwe';
  return isZimbabwe;
}
```

It may also be helpful to use the [Row Node](https://www.ag-grid.com/react-data-grid/row-object/) API `getRoute()` to inspect the route of a row node.

|                                                                                                                                                                                                                                                    |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| getRoute [Copy Link](https://www.ag-grid.com/react-data-grid/server-side-model-grouping/#reference-serverSide-getRoute)<br>Function<br>Returns the route of the row node. If the Row Node does not have a key (i.e it's a group) returns undefined |

Below shows `isServerSideGroupOpenByDefault()` and `getRoute` in action. Note the following:

- The callback opens the following routes as soon as those routes are loaded:
  - **\[Zimbabwe\]**
  - **\[Zimbabwe, Swimming\]**
  - **\[United States, Swimming\]**
- Note **\[Zimbabwe\]** and **\[Zimbabwe, Swimming\]** are visibly open by default.
- Note **\[United States, Swimming\]** is not visibly open by default, as the parent group 'United States' is not open. However when 'United States' is opened, it's 'Swimming' group is opened by default.
- Selecting a group row and clicking 'Route of Selected' will print the route to the selected node to the developer console.

React Example - Server Side Model Grouping - Open By Default

Route of Selected

Group

Year

sum(Gold)

Loading

Hide filesViewing: index.jsx

- styles.css
- fakeServer.jsx
- index.jsx

Language:JavaScriptTypeScript

```jsx
("use client");

import React, {
  useCallback,
  useMemo,
  useRef,
  useState,
  StrictMode,
} from "react";
import { createRoot } from "react-dom/client";
import { AgGridReact } from "ag-grid-react";
import "./styles.css";
import { ModuleRegistry, ValidationModule } from "ag-grid-community";
import {
  RowGroupingModule,
  ServerSideRowModelModule,
} from "ag-grid-enterprise";
import { FakeServer } from "./fakeServer";

ModuleRegistry.registerModules([\
  RowGroupingModule,\
  ServerSideRowModelModule,\
  ...(process.env.NODE_ENV !== "production" ? [ValidationModule] : []),\
]);

const getServerSideDatasource = (server) => {
  return {
    getRows: (params) => {
      console.log("[Datasource] - rows requested by grid: ", params.request);
      const response = server.getData(params.request);
      // adding delay to simulate real server call
      setTimeout(() => {
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
      }, 400);
    },
  };
};

const GridExample = () => {
  const gridRef = useRef(null);
  const containerStyle = useMemo(() => ({ width: "100%", height: "100%" }), []);
  const gridStyle = useMemo(() => ({ height: "100%", width: "100%" }), []);

  const [columnDefs, setColumnDefs] = useState([\
    { field: "country", enableRowGroup: true, rowGroup: true, hide: true },\
    { field: "sport", enableRowGroup: true, rowGroup: true, hide: true },\
    { field: "year", minWidth: 100 },\
    { field: "gold", aggFunc: "sum", enableValue: true },\
    { field: "silver", aggFunc: "sum", enableValue: true },\
    { field: "bronze", aggFunc: "sum", enableValue: true },\
  ]);
  const defaultColDef = useMemo(() => {
    return {
      flex: 1,
      minWidth: 120,
    };
  }, []);
  const autoGroupColumnDef = useMemo(() => {
    return {
      flex: 1,
      minWidth: 280,
    };
  }, []);
  const rowSelection = useMemo(() => {
    return { mode: "multiRow" };
  }, []);

  const onGridReady = useCallback((params) => {
    fetch("https://www.ag-grid.com/example-assets/olympic-winners.json")
      .then((resp) => resp.json())
      .then((data) => {
        // setup the fake server with entire dataset
        const fakeServer = new FakeServer(data);
        // create datasource with a reference to the fake server
        const datasource = getServerSideDatasource(fakeServer);
        // register the datasource with the grid
        params.api.setGridOption("serverSideDatasource", datasource);
      });
  }, []);

  const onBtRouteOfSelected = useCallback(() => {
    const selectedNodes = gridRef.current.api.getSelectedNodes();
    selectedNodes.forEach(function (rowNode, index) {
      const route = rowNode.getRoute();
      const routeString = route ? route.join(",") : undefined;
      console.log("#" + index + ", route = [" + routeString + "]");
    });
  }, []);

  const getRowId = useCallback((params) => {
    return Math.random().toString();
  }, []);

  const isServerSideGroupOpenByDefault = useCallback((params) => {
    const route = params.rowNode.getRoute();
    if (!route) {
      return false;
    }
    const routeAsString = route.join(",");
    const routesToOpenByDefault = [\
      "Zimbabwe",\
      "Zimbabwe,Swimming",\
      "United States,Swimming",\
    ];
    return routesToOpenByDefault.indexOf(routeAsString) >= 0;
  }, []);

  return (
    <div style={containerStyle}>
      <div className="example-wrapper">
        <div style={{ marginBottom: "5px" }}>
          <button onClick={onBtRouteOfSelected}>Route of Selected</button>
        </div>

        <div style={gridStyle}>
          <AgGridReact
            ref={gridRef}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            autoGroupColumnDef={autoGroupColumnDef}
            rowModelType={"serverSide"}
            rowSelection={rowSelection}
            getRowId={getRowId}
            isServerSideGroupOpenByDefault={isServerSideGroupOpenByDefault}
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

## Group Total Rows [Copy Link](https://www.ag-grid.com/react-data-grid/server-side-model-grouping/#group-total-rows)

To enable [Group Total Rows](https://www.ag-grid.com/react-data-grid/aggregation-total-rows/), set the `groupTotalRow` property to 'top' or 'bottom'. Note that the grand total row is not supported by the SSRM.

React Example - Server Side Model Grouping - Group Footer

Group

Year

sum(Gold)

Loading

Hide filesViewing: index.jsx

- styles.css
- fakeServer.jsx
- index.jsx

Language:JavaScriptTypeScript

```jsx
("use client");

import React, { useCallback, useMemo, useState, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AgGridReact } from "ag-grid-react";
import "./styles.css";
import { ModuleRegistry, ValidationModule } from "ag-grid-community";
import {
  RowGroupingModule,
  ServerSideRowModelModule,
} from "ag-grid-enterprise";
import { FakeServer } from "./fakeServer";

ModuleRegistry.registerModules([\
  RowGroupingModule,\
  ServerSideRowModelModule,\
  ...(process.env.NODE_ENV !== "production" ? [ValidationModule] : []),\
]);

const getServerSideDatasource = (server) => {
  return {
    getRows: (params) => {
      console.log("[Datasource] - rows requested by grid: ", params.request);
      const response = server.getData(params.request);
      // adding delay to simulate real server call
      setTimeout(() => {
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
      }, 400);
    },
  };
};

const GridExample = () => {
  const containerStyle = useMemo(() => ({ width: "100%", height: "100%" }), []);
  const gridStyle = useMemo(() => ({ height: "100%", width: "100%" }), []);

  const [columnDefs, setColumnDefs] = useState([\
    { field: "country", enableRowGroup: true, rowGroup: true, hide: true },\
    { field: "sport", enableRowGroup: true, rowGroup: true, hide: true },\
    { field: "year", minWidth: 100 },\
    { field: "gold", aggFunc: "sum", enableValue: true },\
    { field: "silver", aggFunc: "sum", enableValue: true },\
    { field: "bronze", aggFunc: "sum", enableValue: true },\
  ]);
  const defaultColDef = useMemo(() => {
    return {
      flex: 1,
      minWidth: 120,
    };
  }, []);
  const autoGroupColumnDef = useMemo(() => {
    return {
      flex: 1,
      minWidth: 280,
    };
  }, []);

  const onGridReady = useCallback((params) => {
    fetch("https://www.ag-grid.com/example-assets/olympic-winners.json")
      .then((resp) => resp.json())
      .then((data) => {
        // setup the fake server with entire dataset
        const fakeServer = new FakeServer(data);
        // create datasource with a reference to the fake server
        const datasource = getServerSideDatasource(fakeServer);
        // register the datasource with the grid
        params.api.setGridOption("serverSideDatasource", datasource);
      });
  }, []);

  const getRowId = useCallback((params) => {
    return Math.random().toString();
  }, []);

  const isServerSideGroupOpenByDefault = useCallback((params) => {
    const route = params.rowNode.getRoute();
    if (!route) {
      return false;
    }
    const routeAsString = route.join(",");
    const routesToOpenByDefault = ["Zimbabwe", "Zimbabwe,Swimming"];
    return routesToOpenByDefault.indexOf(routeAsString) >= 0;
  }, []);

  return (
    <div style={containerStyle}>
      <div className="example-wrapper">
        <div style={gridStyle}>
          <AgGridReact
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            autoGroupColumnDef={autoGroupColumnDef}
            rowModelType={"serverSide"}
            groupTotalRow={"bottom"}
            getRowId={getRowId}
            isServerSideGroupOpenByDefault={isServerSideGroupOpenByDefault}
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

Group total rows can also be used with `groupDisplayType='multipleColumns'`, as demonstrated in the example below.

React Example - Server Side Model Grouping - Group Footer Multiple Cols

Country

Sport

Hide filesViewing: index.jsx

- styles.css
- fakeServer.jsx
- index.jsx

Language:JavaScriptTypeScript

```jsx
("use client");

import React, { useCallback, useMemo, useState, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AgGridReact } from "ag-grid-react";
import "./styles.css";
import { ModuleRegistry, ValidationModule } from "ag-grid-community";
import {
  RowGroupingModule,
  ServerSideRowModelModule,
} from "ag-grid-enterprise";
import { FakeServer } from "./fakeServer";

ModuleRegistry.registerModules([\
  RowGroupingModule,\
  ServerSideRowModelModule,\
  ...(process.env.NODE_ENV !== "production" ? [ValidationModule] : []),\
]);

const getServerSideDatasource = (server) => {
  return {
    getRows: (params) => {
      console.log("[Datasource] - rows requested by grid: ", params.request);
      const response = server.getData(params.request);
      // adding delay to simulate real server call
      setTimeout(() => {
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
      }, 400);
    },
  };
};

const GridExample = () => {
  const containerStyle = useMemo(() => ({ width: "100%", height: "100%" }), []);
  const gridStyle = useMemo(() => ({ height: "100%", width: "100%" }), []);

  const [columnDefs, setColumnDefs] = useState([\
    { field: "country", enableRowGroup: true, rowGroup: true, hide: true },\
    { field: "sport", enableRowGroup: true, rowGroup: true, hide: true },\
    { field: "year", minWidth: 100 },\
    { field: "gold", aggFunc: "sum", enableValue: true },\
    { field: "silver", aggFunc: "sum", enableValue: true },\
    { field: "bronze", aggFunc: "sum", enableValue: true },\
  ]);
  const defaultColDef = useMemo(() => {
    return {
      flex: 1,
      minWidth: 120,
    };
  }, []);
  const autoGroupColumnDef = useMemo(() => {
    return {
      flex: 1,
      minWidth: 280,
    };
  }, []);

  const onGridReady = useCallback((params) => {
    fetch("https://www.ag-grid.com/example-assets/olympic-winners.json")
      .then((resp) => resp.json())
      .then((data) => {
        // setup the fake server with entire dataset
        const fakeServer = new FakeServer(data);
        // create datasource with a reference to the fake server
        const datasource = getServerSideDatasource(fakeServer);
        // register the datasource with the grid
        params.api.setGridOption("serverSideDatasource", datasource);
      });
  }, []);

  const getRowId = useCallback((params) => {
    return Math.random().toString();
  }, []);

  const isServerSideGroupOpenByDefault = useCallback((params) => {
    const route = params.rowNode.getRoute();
    if (!route) {
      return false;
    }
    const routeAsString = route.join(",");
    const routesToOpenByDefault = ["Zimbabwe", "Zimbabwe,Swimming"];
    return routesToOpenByDefault.indexOf(routeAsString) >= 0;
  }, []);

  return (
    <div style={containerStyle}>
      <div className="example-wrapper">
        <div style={gridStyle}>
          <AgGridReact
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            autoGroupColumnDef={autoGroupColumnDef}
            rowModelType={"serverSide"}
            groupTotalRow={"bottom"}
            groupDisplayType={"multipleColumns"}
            getRowId={getRowId}
            isServerSideGroupOpenByDefault={isServerSideGroupOpenByDefault}
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

## Hide Open Parents [Copy Link](https://www.ag-grid.com/react-data-grid/server-side-model-grouping/#hide-open-parents)

In some configurations it may be desired for the group row to be hidden when expanded, this can be achieved by setting the `groupHideOpenParents` property to true.

The example below has been styled in a way that demonstrates the behaviour of the groups. Note how upon expanding a group, the group row is replaced by the first of its children, and only when collapsed is the group row is shown again.

React Example - Server Side Model Grouping - Hide Open Parents

Top Level GroupSecond Level GroupBottom Rows

Country

Sport

Hide filesViewing: index.jsx

- styles.css
- fakeServer.jsx
- index.jsx

Language:JavaScriptTypeScript

```jsx
("use client");

import React, { useCallback, useMemo, useState, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AgGridReact } from "ag-grid-react";
import "./styles.css";
import { ModuleRegistry, ValidationModule } from "ag-grid-community";
import {
  RowGroupingModule,
  ServerSideRowModelModule,
} from "ag-grid-enterprise";
import { FakeServer } from "./fakeServer";

ModuleRegistry.registerModules([\
  RowGroupingModule,\
  ServerSideRowModelModule,\
  ...(process.env.NODE_ENV !== "production" ? [ValidationModule] : []),\
]);

const getServerSideDatasource = (server) => {
  return {
    getRows: (params) => {
      console.log("[Datasource] - rows requested by grid: ", params.request);
      const response = server.getData(params.request);
      // adding delay to simulate real server call
      setTimeout(() => {
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
      }, 2500);
    },
  };
};

const GridExample = () => {
  const containerStyle = useMemo(() => ({ width: "100%", height: "100%" }), []);
  const gridStyle = useMemo(() => ({ height: "100%", width: "100%" }), []);

  const [columnDefs, setColumnDefs] = useState([\
    { field: "country", rowGroup: true, hide: true },\
    { field: "sport", rowGroup: true, hide: true },\
    { field: "year", minWidth: 100 },\
    { field: "gold", aggFunc: "sum", enableValue: true },\
    { field: "silver", aggFunc: "sum", enableValue: true },\
    { field: "bronze", aggFunc: "sum", enableValue: true },\
  ]);
  const defaultColDef = useMemo(() => {
    return {
      flex: 1,
      minWidth: 120,
    };
  }, []);
  const autoGroupColumnDef = useMemo(() => {
    return {
      flex: 1,
      minWidth: 280,
    };
  }, []);

  const onGridReady = useCallback((params) => {
    fetch("https://www.ag-grid.com/example-assets/olympic-winners.json")
      .then((resp) => resp.json())
      .then((data) => {
        // setup the fake server with entire dataset
        const fakeServer = new FakeServer(data);
        // create datasource with a reference to the fake server
        const datasource = getServerSideDatasource(fakeServer);
        // register the datasource with the grid
        params.api.setGridOption("serverSideDatasource", datasource);
      });
  }, []);

  return (
    <div style={containerStyle}>
      <div className="example-wrapper">
        <div className="example-header">
          <span className="legend-item ag-row-level-0"></span>
          <span className="legend-label">Top Level Group</span>
          <span className="legend-item ag-row-level-1"></span>
          <span className="legend-label">Second Level Group</span>
          <span className="legend-item ag-row-level-2"></span>
          <span className="legend-label">Bottom Rows</span>
        </div>

        <div style={gridStyle}>
          <AgGridReact
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            autoGroupColumnDef={autoGroupColumnDef}
            rowModelType={"serverSide"}
            groupHideOpenParents={true}
            cacheBlockSize={5}
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

When `groupHideOpenParents=true` the Grid automatically disables the [Sticky Groups](https://www.ag-grid.com/react-data-grid/grouping-opening-groups/#prevent-sticky-groups) behaviour of the rows as well as [Full Width Loading](https://www.ag-grid.com/react-data-grid/component-loading-cell-renderer/#skeleton-loading).

## Unbalanced Groups [Copy Link](https://www.ag-grid.com/react-data-grid/server-side-model-grouping/#unbalanced-groups)

To enable unbalanced groups in the SSRM, set the `groupAllowUnbalanced` property to true. This causes any group with a key of `''` to behave as if it is always expanded, and the group row to always be hidden.

React Example - Server Side Model Grouping - Unbalanced Groups

Hide filesViewing: index.jsx

- fakeServer.jsx
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
import { FakeServer } from "./fakeServer";

ModuleRegistry.registerModules([\
  RowGroupingModule,\
  ServerSideRowModelModule,\
  ...(process.env.NODE_ENV !== "production" ? [ValidationModule] : []),\
]);

const getServerSideDatasource = (server) => {
  return {
    getRows: (params) => {
      console.log("[Datasource] - rows requested by grid: ", params.request);
      const response = server.getData(params.request);
      // adding delay to simulate real server call
      setTimeout(() => {
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
      }, 2000);
    },
  };
};

const GridExample = () => {
  const containerStyle = useMemo(() => ({ width: "100%", height: "100%" }), []);
  const gridStyle = useMemo(() => ({ height: "100%", width: "100%" }), []);

  const [columnDefs, setColumnDefs] = useState([\
    { field: "country", rowGroup: true, hide: true },\
    { field: "sport" },\
    { field: "year", minWidth: 100 },\
    { field: "gold", aggFunc: "sum", enableValue: true },\
    { field: "silver", aggFunc: "sum", enableValue: true },\
    { field: "bronze", aggFunc: "sum", enableValue: true },\
  ]);
  const defaultColDef = useMemo(() => {
    return {
      flex: 1,
      minWidth: 120,
    };
  }, []);
  const autoGroupColumnDef = useMemo(() => {
    return {
      flex: 1,
      minWidth: 280,
    };
  }, []);

  const onGridReady = useCallback((params) => {
    fetch("https://www.ag-grid.com/example-assets/small-olympic-winners.json")
      .then((resp) => resp.json())
      .then((data) => {
        // add unbalanced data to the top of the dataset
        const unbalancedData = data.map((item) => ({
          ...item,
          country: item.country === null ? "" : item.country,
        }));
        unbalancedData.sort((a, b) => (a.country === "" ? -1 : 1));
        // setup the fake server with entire dataset
        const fakeServer = new FakeServer(unbalancedData);
        // create datasource with a reference to the fake server
        const datasource = getServerSideDatasource(fakeServer);
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
          autoGroupColumnDef={autoGroupColumnDef}
          rowModelType={"serverSide"}
          groupAllowUnbalanced={true}
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

When using `groupAllowUnbalanced=true` it is important to remember that a row group still exists to contain the unbalanced nodes, this can be an important consideration when working with selection state, refreshing, or group paths. This also means that there will be additional requests and delays in loading these unbalanced rows, as they do not belong to the parent row.

## Expand All / Collapse All [Copy Link](https://www.ag-grid.com/react-data-grid/server-side-model-grouping/#expand-all--collapse-all)

It is possible to expand and collapse all group rows using the `expandAll()` and `collapseAll()` grid API's.

```jsx
// Expand all group rows
gridApi.expandAll();

// Collapse all group rows
gridApi.collapseAll();
```

Calling `expandAll()` and `collapseAll()` will impact **all loaded group nodes**, including those not visible due to their containing group been closed. This means there could potentially be a huge number of groups expanded, so this method should be used very wisely to not create massive amount of server requests and loading a large amount of data.

Calling `expandAll()` and `collapseAll()` will have no impact on rows yet to be loaded.

To open only specific groups, e.g. only groups at the top level, then use the `forEachNode()` callback and open / close the row using `setExpanded()` as follows:

```jsx
// Expand all top level row nodes
gridApi.forEachNode(node => {
  if (node.group && node.level == 0) {
    node.setExpanded(true);
  }
});
```

The example below demonstrates these techniques. Note the following:

- Clicking 'Expand All' will expand all loaded group rows. Doing this when the grid initially loads will expand all Year groups. Clicking it a second time (after Year groups have loaded) will cause all Year groups as well as their children Country groups to be expanded - this is a heavier operation with 100's of rows to expand.

- Clicking 'Collapse All' will collapse all rows.

- Clicking 'Expand Top Level Only' will expand Years only, even if more group rows are loaded..

React Example - Server Side Model Grouping - Expand All

Expand AllCollapse AllExpand Top Level Only

Group

sum(Gold)

sum(Silver)

Loading

Hide filesViewing: index.jsx

- styles.css
- fakeServer.jsx
- index.jsx

Language:JavaScriptTypeScript

```jsx
("use client");

import React, {
  useCallback,
  useMemo,
  useRef,
  useState,
  StrictMode,
} from "react";
import { createRoot } from "react-dom/client";
import { AgGridReact } from "ag-grid-react";
import "./styles.css";
import {
  ModuleRegistry,
  RowApiModule,
  ValidationModule,
} from "ag-grid-community";
import {
  RowGroupingModule,
  ServerSideRowModelApiModule,
  ServerSideRowModelModule,
} from "ag-grid-enterprise";
import { FakeServer } from "./fakeServer";

ModuleRegistry.registerModules([\
  RowApiModule,\
  RowGroupingModule,\
  ServerSideRowModelModule,\
  ServerSideRowModelApiModule,\
  ...(process.env.NODE_ENV !== "production" ? [ValidationModule] : []),\
]);

const getServerSideDatasource = (server) => {
  return {
    getRows: (params) => {
      console.log("[Datasource] - rows requested by grid: ", params.request);
      const response = server.getData(params.request);
      // adding delay to simulate real server call
      setTimeout(() => {
        if (response.success) {
          // call the success callback
          params.success({
            rowData: response.rows,
            rowCount: response.lastRow,
            groupLevelInfo: {
              lastLoadedTime: new Date().toLocaleString(),
              randomValue: Math.random(),
            },
          });
        } else {
          // inform the grid request failed
          params.fail();
        }
      }, 200);
    },
  };
};

const GridExample = () => {
  const gridRef = useRef(null);
  const containerStyle = useMemo(() => ({ width: "100%", height: "100%" }), []);
  const gridStyle = useMemo(() => ({ height: "100%", width: "100%" }), []);

  const [columnDefs, setColumnDefs] = useState([\
    {\
      field: "year",\
      enableRowGroup: true,\
      rowGroup: true,\
      hide: true,\
      minWidth: 100,\
    },\
    { field: "country", enableRowGroup: true, rowGroup: true, hide: true },\
    { field: "sport", enableRowGroup: true, rowGroup: true, hide: true },\
    { field: "gold", aggFunc: "sum", enableValue: true },\
    { field: "silver", aggFunc: "sum", enableValue: true },\
    { field: "bronze", aggFunc: "sum", enableValue: true },\
  ]);
  const defaultColDef = useMemo(() => {
    return {
      flex: 1,
      minWidth: 120,
    };
  }, []);
  const autoGroupColumnDef = useMemo(() => {
    return {
      flex: 1,
      minWidth: 280,
    };
  }, []);

  const onGridReady = useCallback((params) => {
    fetch("https://www.ag-grid.com/example-assets/olympic-winners.json")
      .then((resp) => resp.json())
      .then((data) => {
        // setup the fake server with entire dataset
        const fakeServer = new FakeServer(data);
        // create datasource with a reference to the fake server
        const datasource = getServerSideDatasource(fakeServer);
        // register the datasource with the grid
        params.api.setGridOption("serverSideDatasource", datasource);
      });
  }, []);

  const onBtExpandAll = useCallback(() => {
    gridRef.current.api.expandAll();
  }, []);

  const onBtCollapseAll = useCallback(() => {
    gridRef.current.api.collapseAll();
  }, []);

  const onBtExpandTopLevel = useCallback(() => {
    gridRef.current.api.forEachNode(function (node) {
      if (node.group && node.level == 0) {
        node.setExpanded(true);
      }
    });
  }, []);

  return (
    <div style={containerStyle}>
      <div className="example-wrapper">
        <div style={{ marginBottom: "5px" }}>
          <button onClick={onBtExpandAll}>Expand All</button>
          &nbsp;&nbsp;&nbsp;
          <button onClick={onBtCollapseAll}>Collapse All</button>
          &nbsp;&nbsp;&nbsp;
          <button onClick={onBtExpandTopLevel}>Expand Top Level Only</button>
        </div>

        <div style={gridStyle}>
          <AgGridReact
            ref={gridRef}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            autoGroupColumnDef={autoGroupColumnDef}
            maxConcurrentDatasourceRequests={1}
            rowModelType={"serverSide"}
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

## Providing Child Counts [Copy Link](https://www.ag-grid.com/react-data-grid/server-side-model-grouping/#providing-child-counts)

By default, the grid will not show row counts beside the group names. If you do want row counts, you need to implement the `getChildCount(dataItem)` callback for the grid. The callback provides you with the row data; it is your application's responsibility to know what the child row count is. The suggestion is you set this information into the row data item you provide to the grid.

|                                                                                                                                                                                                                                                                                                                                                                                     |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| getChildCount [Copy Link](https://www.ag-grid.com/react-data-grid/server-side-model-grouping/#reference-serverSideRowModel-getChildCount)<br>Function<br>[Initial](https://www.ag-grid.com/react-data-grid/grid-interface/#initial-grid-options)<br>Allows setting the child count for a group row.<br>[ServerSideRowModelModule](https://www.ag-grid.com/react-data-grid/modules/) |

```jsx
const getChildCount = data => {
  // here child count is stored in the 'childCount' property
  return data.childCount;
};

<AgGridReact getChildCount={getChildCount} />;
```

React Example - Server Side Model Grouping - Child Counts

Group

sum(Gold)

sum(Silver)

Loading

Hide filesViewing: index.jsx

- fakeServer.jsx
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
import { FakeServer } from "./fakeServer";

ModuleRegistry.registerModules([\
  RowGroupingModule,\
  ServerSideRowModelModule,\
  ...(process.env.NODE_ENV !== "production" ? [ValidationModule] : []),\
]);

const getServerSideDatasource = (server) => {
  return {
    getRows: (params) => {
      console.log("[Datasource] - rows requested by grid: ", params.request);
      const response = server.getData(params.request);
      // adding delay to simulate real server call
      setTimeout(() => {
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
      }, 200);
    },
  };
};

const GridExample = () => {
  const containerStyle = useMemo(() => ({ width: "100%", height: "100%" }), []);
  const gridStyle = useMemo(() => ({ height: "100%", width: "100%" }), []);

  const [columnDefs, setColumnDefs] = useState([\
    { field: "country", rowGroup: true, hide: true },\
    { field: "sport", rowGroup: true, hide: true },\
    { field: "gold", aggFunc: "sum", enableValue: true },\
    { field: "silver", aggFunc: "sum", enableValue: true },\
    { field: "bronze", aggFunc: "sum", enableValue: true },\
  ]);
  const defaultColDef = useMemo(() => {
    return {
      flex: 1,
      minWidth: 150,
    };
  }, []);
  const autoGroupColumnDef = useMemo(() => {
    return {
      flex: 1,
      minWidth: 280,
    };
  }, []);
  const getChildCount = useCallback((data) => {
    return data ? data.childCount : undefined;
  }, []);

  const onGridReady = useCallback((params) => {
    fetch("https://www.ag-grid.com/example-assets/olympic-winners.json")
      .then((resp) => resp.json())
      .then((data) => {
        // setup the fake server with entire dataset
        const fakeServer = new FakeServer(data);
        // create datasource with a reference to the fake server
        const datasource = getServerSideDatasource(fakeServer);
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
          autoGroupColumnDef={autoGroupColumnDef}
          rowModelType={"serverSide"}
          getChildCount={getChildCount}
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

## Group via Value Getter [Copy Link](https://www.ag-grid.com/react-data-grid/server-side-model-grouping/#group-via-value-getter)

It is possible the data provided has composite objects, in which case it's more difficult for the grid to extract group names. This can be worked with using value getters or embedded fields (i.e. the field attribute has dot notation).

In the example below, all rows are modified so that the rows look something like this:

```js
// sample contents of row data
{
    // country field is complex object
    country: {
        name: 'Ireland',
        code: 'IRE'
    },

    // year field is complex object
    year: {
        name: '2012',
        shortName: "'12"
    },

    // other fields as normal
    ...
}

```

Then the columns are set up so that country uses a `valueGetter` that uses the field with dot notation, i.e. `data.country.name`

React Example - Server Side Model Grouping - Complex Objects

Group

sum(Gold)

sum(Silver)

Hide filesViewing: index.jsx

- fakeServer.jsx
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
import { FakeServer } from "./fakeServer";

ModuleRegistry.registerModules([\
  RowGroupingModule,\
  ServerSideRowModelModule,\
  ...(process.env.NODE_ENV !== "production" ? [ValidationModule] : []),\
]);

const getServerSideDatasource = (server) => {
  return {
    getRows: (params) => {
      console.log("[Datasource] - rows requested by grid: ", params.request);
      const response = server.getData(params.request);
      // convert country to a complex object
      const resultsWithComplexObjects = response.rows.map(function (row) {
        row.country = {
          name: row.country,
          code: row.country.substring(0, 3).toUpperCase(),
        };
        return row;
      });
      // adding delay to simulate real server call
      setTimeout(() => {
        if (response.success) {
          // call the success callback
          params.success({
            rowData: resultsWithComplexObjects,
            rowCount: response.lastRow,
          });
        } else {
          // inform the grid request failed
          params.fail();
        }
      }, 200);
    },
  };
};

const GridExample = () => {
  const containerStyle = useMemo(() => ({ width: "100%", height: "100%" }), []);
  const gridStyle = useMemo(() => ({ height: "100%", width: "100%" }), []);

  const [columnDefs, setColumnDefs] = useState([\
    // here we are using a valueGetter to get the country name from the complex object\
    {\
      colId: "country",\
      valueGetter: "data.country.name",\
      rowGroup: true,\
      hide: true,\
    },\
    { field: "gold", aggFunc: "sum", enableValue: true },\
    { field: "silver", aggFunc: "sum", enableValue: true },\
    { field: "bronze", aggFunc: "sum", enableValue: true },\
  ]);
  const defaultColDef = useMemo(() => {
    return {
      flex: 1,
      minWidth: 150,
    };
  }, []);
  const autoGroupColumnDef = useMemo(() => {
    return {
      flex: 1,
      minWidth: 280,
    };
  }, []);

  const onGridReady = useCallback((params) => {
    fetch("https://www.ag-grid.com/example-assets/olympic-winners.json")
      .then((resp) => resp.json())
      .then((data) => {
        // setup the fake server with entire dataset
        const fakeServer = new FakeServer(data);
        // create datasource with a reference to the fake server
        const datasource = getServerSideDatasource(fakeServer);
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
          autoGroupColumnDef={autoGroupColumnDef}
          rowModelType={"serverSide"}
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

## Filters [Copy Link](https://www.ag-grid.com/react-data-grid/server-side-model-grouping/#filters)

By default the grid will fully purge the grid when impacted by the change in filters. The grid can be configured to only refresh when the group has been directly impacted by enabling `serverSideOnlyRefreshFilteredGroups`. Be aware, this can mean your grid may have empty group rows. This is because the grid will not refresh the groups above the groups it deems impacted by the filter.

In the example below, note the following:

- Filtering by `Gold`, `Silver` or `Bronze` fully purges the grid, this is because they have aggregations applied.
- Applying a filter to the `Year` column does not purge the entire grid, and instead only refreshes the `Year` group rows.
- The example enables `serverSideOnlyRefreshFilteredGroups`, note that if you apply a filter to `Year` with the value `1900`, no leaf rows exist in any group.

React Example - Server Side Model Grouping - Filtering

Group

Year

sum(Gold)

Hide filesViewing: index.jsx

- fakeServer.jsx
- index.jsx

Language:JavaScriptTypeScript

```jsx
("use client");

import React, { useCallback, useMemo, useState, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AgGridReact } from "ag-grid-react";
import {
  ModuleRegistry,
  NumberFilterModule,
  TextFilterModule,
  ValidationModule,
} from "ag-grid-community";
import {
  RowGroupingModule,
  ServerSideRowModelModule,
} from "ag-grid-enterprise";
import { FakeServer } from "./fakeServer";

ModuleRegistry.registerModules([\
  TextFilterModule,\
  RowGroupingModule,\
  ServerSideRowModelModule,\
  NumberFilterModule,\
  ...(process.env.NODE_ENV !== "production" ? [ValidationModule] : []),\
]);

const getServerSideDatasource = (server) => {
  return {
    getRows: (params) => {
      console.log("[Datasource] - rows requested by grid: ", params.request);
      const response = server.getData(params.request);
      // adding delay to simulate real server call
      setTimeout(() => {
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

const GridExample = () => {
  const containerStyle = useMemo(() => ({ width: "100%", height: "100%" }), []);
  const gridStyle = useMemo(() => ({ height: "100%", width: "100%" }), []);

  const [columnDefs, setColumnDefs] = useState([\
    { field: "country", rowGroup: true, hide: true },\
    { field: "sport", rowGroup: true, hide: true },\
    {\
      field: "year",\
      minWidth: 100,\
      filter: "agNumberColumnFilter",\
      floatingFilter: true,\
    },\
    {\
      field: "gold",\
      aggFunc: "sum",\
      filter: "agNumberColumnFilter",\
      floatingFilter: true,\
      enableValue: true,\
    },\
    {\
      field: "silver",\
      aggFunc: "sum",\
      filter: "agNumberColumnFilter",\
      floatingFilter: true,\
      enableValue: true,\
    },\
    {\
      field: "bronze",\
      aggFunc: "sum",\
      filter: "agNumberColumnFilter",\
      floatingFilter: true,\
      enableValue: true,\
    },\
  ]);
  const defaultColDef = useMemo(() => {
    return {
      flex: 1,
      minWidth: 120,
    };
  }, []);
  const autoGroupColumnDef = useMemo(() => {
    return {
      flex: 1,
      minWidth: 280,
      field: "athlete",
    };
  }, []);

  const onGridReady = useCallback((params) => {
    fetch("https://www.ag-grid.com/example-assets/olympic-winners.json")
      .then((resp) => resp.json())
      .then((data) => {
        // setup the fake server with entire dataset
        const fakeServer = new FakeServer(data);
        // create datasource with a reference to the fake server
        const datasource = getServerSideDatasource(fakeServer);
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
          autoGroupColumnDef={autoGroupColumnDef}
          serverSideOnlyRefreshFilteredGroups={true}
          rowModelType={"serverSide"}
          cacheBlockSize={5}
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
