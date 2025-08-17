If you are dealing with large amounts of data, your applications may decide to use pagination to help the user navigate through the data.

## Enabling Pagination [Copy Link](https://www.ag-grid.com/react-data-grid/server-side-model-pagination/#enabling-pagination)

Pagination is enabled in the grid via the `pagination` grid option. The pagination page size is typically set alongside this using the `paginationPageSize` option. These options are shown below:

```jsx
// enables pagination in the grid
const pagination = true;

// sets 10 rows per page (default is 100)
const paginationPageSize = 10;

// allows the user to select the page size from a predefined list of page sizes
const paginationPageSizeSelector = [10, 20, 50, 100];

<AgGridReact
  pagination={pagination}
  paginationPageSize={paginationPageSize}
  paginationPageSizeSelector={paginationPageSizeSelector}
/>;
```

For more configuration details see the section on [Pagination](https://www.ag-grid.com/react-data-grid/row-pagination/).

## Server-Side Pagination [Copy Link](https://www.ag-grid.com/react-data-grid/server-side-model-pagination/#server-side-pagination)

The actual pagination of rows is performed on the server when using the Server-Side Row Model. When the grid needs more rows it makes a request via `getRows(params)` on the [Server-Side Datasource](https://www.ag-grid.com/react-data-grid/server-side-model-datasource/) with metadata containing pagination details.

The properties relevant to pagination in the request are shown below:

```js
// IServerSideGetRowsRequest
{
    // first row requested
    startRow: number,

    // index after last row requested
    endRow: number,

... // other params
}

```

The `endRow` requested by the grid may not actually exist in the data so the correct `lastRowIndex` should be supplied in the response to the grid. See [Server-Side Datasource](https://www.ag-grid.com/react-data-grid/server-side-model-datasource/) for more details.

## Example: Server-Side Pagination [Copy Link](https://www.ag-grid.com/react-data-grid/server-side-model-pagination/#example-server-side-pagination)

The example below demonstrates server-side Pagination. Note the following:

- Pagination is enabled using the grid option `pagination=true`.
- A pagination page size of 10 (default is 100) is set using the grid option `paginationPageSize=10`.
- The number of rows returned per request is set to 10 (default is 100) using `cacheBlockSize=10`.
- Use the arrows in the pagination panel to traverse the data. Note the last page arrow is greyed out as the last row index is only supplied to the grid when the last row has been reached.
- Open the browser's dev console to view the request supplied to the datasource.

React Example - Server Side Model Pagination - Pagination

Id

Athlete

Age

Year

Gold

Page Size:

20

1to?ofmore

Page1ofmore

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
  PaginationModule,
  ValidationModule,
} from "ag-grid-community";
import {
  ColumnMenuModule,
  ColumnsToolPanelModule,
  ContextMenuModule,
  ServerSideRowModelModule,
} from "ag-grid-enterprise";
import { FakeServer } from "./fakeServer";

ModuleRegistry.registerModules([\
  PaginationModule,\
  ColumnsToolPanelModule,\
  ColumnMenuModule,\
  ContextMenuModule,\
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
    { field: "id", maxWidth: 75 },\
    { field: "athlete", minWidth: 190 },\
    { field: "age" },\
    { field: "year" },\
    { field: "gold" },\
    { field: "silver" },\
    { field: "bronze" },\
  ]);
  const defaultColDef = useMemo(() => {
    return {
      flex: 1,
      minWidth: 90,
    };
  }, []);

  const onGridReady = useCallback((params) => {
    fetch("https://www.ag-grid.com/example-assets/olympic-winners.json")
      .then((resp) => resp.json())
      .then((data) => {
        // add id to data
        let idSequence = 1;
        data.forEach(function (item) {
          item.id = idSequence++;
        });
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
          rowModelType={"serverSide"}
          pagination={true}
          paginationPageSize={20}
          cacheBlockSize={10}
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

## Pagination with Groups [Copy Link](https://www.ag-grid.com/react-data-grid/server-side-model-pagination/#pagination-with-groups)

When grouping, pagination splits rows according to top-level groups only. This has the following implications:

- The number of pages is determined by the number of top-level rows and not children
- When groups are expanded, the number of pagination pages does not change.
- When groups are expanded, all children rows appear on the same page as the parent row.

The example below demonstrates pagination with grouping. Note the following:

- No block size is specified so 100 rows per block is used.
- Grid property `paginationAutoPageSize=true` is set. This means the number of displayed rows is automatically set to the number of rows that fit the vertical scroll, so no vertical scroll is present.
- As rows are expanded, the number of visible rows in a page grows. The children appear on the same row as the parent and no rows are pushed to the next page.
- For example, expand 'Australia' which will result in a large list for which vertical scrolling will be needed to view all children.

React Example - Server Side Model Pagination - Pagination With Groups

Group

Athlete

Gold

1to?ofmore

Page1ofmore

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
  PaginationModule,
  ValidationModule,
} from "ag-grid-community";
import {
  ColumnMenuModule,
  ColumnsToolPanelModule,
  ContextMenuModule,
  RowGroupingModule,
  ServerSideRowModelModule,
} from "ag-grid-enterprise";
import { FakeServer } from "./fakeServer";

ModuleRegistry.registerModules([\
  PaginationModule,\
  ColumnsToolPanelModule,\
  ColumnMenuModule,\
  ContextMenuModule,\
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
    { field: "athlete", minWidth: 190 },\
    { field: "gold", aggFunc: "sum" },\
    { field: "silver", aggFunc: "sum" },\
    { field: "bronze", aggFunc: "sum" },\
  ]);
  const defaultColDef = useMemo(() => {
    return {
      flex: 1,
      minWidth: 90,
    };
  }, []);
  const autoGroupColumnDef = useMemo(() => {
    return {
      flex: 1,
      minWidth: 180,
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
          pagination={true}
          paginationAutoPageSize={true}
          suppressAggFuncInHeader={true}
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

## Pagination with Child Rows [Copy Link](https://www.ag-grid.com/react-data-grid/server-side-model-pagination/#pagination-with-child-rows)

If it is desired to keep the row count exactly at the page size, then set grid property `paginateChildRows=true`.

This will have the effect that child rows will get included in the pagination calculation. This will mean if a group is expanded, the pagination will split the child rows across pages and also possibly push later groups into later pages.

The example below demonstrates pagination with grouping and `paginateChildRows=true`. Note the following:

- No block size is specified thus 100 rows per block is used.

- Grid property `paginationAutoPageSize=true` is set. This means the number of displayed rows is automatically set to the number of rows that fit the vertical scroll.

- As rows are expanded, the number of visible rows in each page is fixed. This means expanding groups will push rows to the next page. This includes later group rows and also its own child rows (if the child rows don't fit on the current page).

- If the last visible row is expanded, the grid gives a confusing user experience, as the rows appear on the next page. So the user will have to click 'expand' and then click 'next page' to see the child rows. This is the desired behaviour as the grid keeps the number of rows on one page consistent. If this behaviour is not desired, then do not use `paginationAutoPageSize=true`.

React Example - Server Side Model Pagination - Paginate Child Rows

Group

Athlete

Gold

Silver

Bronze

1to?ofmore

Page0ofmore

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
  PaginationModule,
  ValidationModule,
} from "ag-grid-community";
import {
  ColumnMenuModule,
  ColumnsToolPanelModule,
  ContextMenuModule,
  RowGroupingModule,
  ServerSideRowModelModule,
} from "ag-grid-enterprise";
import { FakeServer } from "./fakeServer";

ModuleRegistry.registerModules([\
  PaginationModule,\
  ColumnsToolPanelModule,\
  ColumnMenuModule,\
  ContextMenuModule,\
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
    { field: "athlete" },\
    { field: "gold", aggFunc: "sum" },\
    { field: "silver", aggFunc: "sum" },\
    { field: "bronze", aggFunc: "sum" },\
  ]);
  const defaultColDef = useMemo(() => {
    return {
      flex: 1,
      minWidth: 100,
    };
  }, []);
  const autoGroupColumnDef = useMemo(() => {
    return {
      flex: 1,
      minWidth: 180,
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
          cacheBlockSize={100}
          pagination={true}
          paginationAutoPageSize={true}
          paginateChildRows={true}
          suppressAggFuncInHeader={true}
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

## Next Up [Copy Link](https://www.ag-grid.com/react-data-grid/server-side-model-pagination/#next-up)

Continue to the next section to learn about [Row Selection](https://www.ag-grid.com/react-data-grid/server-side-model-selection/).
