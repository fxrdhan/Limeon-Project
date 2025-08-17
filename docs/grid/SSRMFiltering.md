This section covers Filtering using the Server-Side Row Model (SSRM).

## Enabling Filtering [Copy Link](https://www.ag-grid.com/react-data-grid/server-side-model-filtering/#enabling-filtering)

Filtering is enabled in the grid via the `filter` column definition attribute.

```jsx
const [columnDefs, setColumnDefs] = useState([\
    // sets the 'text' filter\
    { field: 'country', filter: 'agTextColumnFilter' },\
\
    // use the default 'set' filter\
    { field: 'year', filter: true },\
\
    // no filter (unspecified)\
    { field: 'sport' },\
]);

<AgGridReact columnDefs={columnDefs} />
```

For more details on filtering configurations see the section on [Column Filtering](https://www.ag-grid.com/react-data-grid/filtering/).

## Server-side Filtering [Copy Link](https://www.ag-grid.com/react-data-grid/server-side-model-filtering/#server-side-filtering)

The actual filtering of rows is performed on the server when using the Server-Side Row Model. When a filter is applied in the grid a request is made for more rows via `getRows(params)` on the [Server-Side Datasource](https://www.ag-grid.com/react-data-grid/server-side-model-datasource/). The supplied params includes a request containing filter metadata contained in the `filterModel` property.

The request object sent to the server contains filter metadata in the `filterModel` property, an example is shown below:

```js
// Example request with filter info
{
    filterModel: {
        athlete: {
            filterType: 'text',
            type: 'contains',
            filter: 'fred'
        },
        year: {
            filterType: 'number',
            type: 'greaterThan',
            filter: 2005,
            filterTo: null
        }
    },

    // other properties
}

```

Notice in the snippet above the `filterModel` object contains a `'text'` and `'number'` filter. This filter metadata is used by the server to perform the filtering.

For more details on properties and values used in these filters see the sections on [Text Filter Model](https://www.ag-grid.com/react-data-grid/filter-text/#text-filter-model) and [Number Filter Model](https://www.ag-grid.com/react-data-grid/filter-number/#number-filter-model).

The example below demonstrates filtering using Simple Column Filters, note the following:

- The **Athlete** column has a `'text'` filter defined using `filter: 'agTextColumnFilter'`.
- The **Year** column has a `'number'` filter defined using `filter: 'agNumberColumnFilter'`.
- The medals columns have a `'number'` filter defined using `filter: 'agNumberColumnFilter'` on the `'number'` column type.
- The server uses the metadata contained in the `filterModel` to filter the rows.
- Open the browser's dev console to view the `filterModel` supplied in the request to the datasource.

React Example - Server Side Model Filtering - Infinite Simple

Athlete

Year

Gold

Silver

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
  ColumnMenuModule,
  ContextMenuModule,
  ServerSideRowModelModule,
} from "ag-grid-enterprise";
import { FakeServer } from "./fakeServer";

ModuleRegistry.registerModules([\
  ColumnMenuModule,\
  ContextMenuModule,\
  ServerSideRowModelModule,\
  TextFilterModule,\
  NumberFilterModule,\
  ...(process.env.NODE_ENV !== "production" ? [ValidationModule] : []),\
]);

const getServerSideDatasource = (server) => {
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

const GridExample = () => {
  const containerStyle = useMemo(() => ({ width: "100%", height: "100%" }), []);
  const gridStyle = useMemo(() => ({ height: "100%", width: "100%" }), []);

  const [columnDefs, setColumnDefs] = useState([\
    {\
      field: "athlete",\
      filter: "agTextColumnFilter",\
      minWidth: 220,\
    },\
    {\
      field: "year",\
      filter: "agNumberColumnFilter",\
      filterParams: {\
        buttons: ["reset"],\
        debounceMs: 1000,\
        maxNumConditions: 1,\
      },\
    },\
    { field: "gold", type: "number" },\
    { field: "silver", type: "number" },\
    { field: "bronze", type: "number" },\
  ]);
  const defaultColDef = useMemo(() => {
    return {
      flex: 1,
      minWidth: 100,
      suppressHeaderMenuButton: true,
      suppressHeaderContextMenu: true,
    };
  }, []);
  const columnTypes = useMemo(() => {
    return {
      number: { filter: "agNumberColumnFilter" },
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
          columnTypes={columnTypes}
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

## Set Filtering [Copy Link](https://www.ag-grid.com/react-data-grid/server-side-model-filtering/#set-filtering)

Filtering using the [Set Filter](https://www.ag-grid.com/react-data-grid/filter-set/) has a few differences to filtering with Simple Filters.

### Set Filter Model [Copy Link](https://www.ag-grid.com/react-data-grid/server-side-model-filtering/#set-filter-model)

Entries in the `filterModel` have a different format to the Simple Filters. This filter model is what gets passed as part of the request to the server when using Server-side Filtering. The following shows an example of a Set Filter where two items are selected:

```js
// IServerSideGetRowsRequest
{
    filterModel: {
        country: {
            filterType: 'set',
            values: ['Australia', 'Belgium']
        }
    },

    // other properties
}

```

### Set Filter Values [Copy Link](https://www.ag-grid.com/react-data-grid/server-side-model-filtering/#set-filter-values)

When using the Set Filter with the SSRM it is necessary to supply the values as the grid does not have all rows loaded. This can be done either synchronously or asynchronously using the `values` filter param as shown below:

```jsx
const [columnDefs, setColumnDefs] = useState([\
    // colDef with Set Filter values supplied synchronously\
    {\
        field: 'country',\
        filter: 'agSetColumnFilter',\
        filterParams: {\
            values: ['Australia', 'China', 'Sweden']\
        }\
    },\
    // colDef with Set Filter values supplied asynchronously\
    {\
        field: 'country',\
        filter: 'agSetColumnFilter',\
        filterParams: {\
            values: params => {\
                // simulating async delay\
                setTimeout(() => params.success(['Australia', 'China', 'Sweden']), 500);\
            }\
        }\
    }\
]);

<AgGridReact columnDefs={columnDefs} />
```

For more details on setting values, see [Supplying Filter Values](https://www.ag-grid.com/react-data-grid/filter-set-filter-list/#supplying-filter-values). Once you have supplied values to the Set Filter, they will not change unless you ask for them to be refreshed. See [Refreshing Values](https://www.ag-grid.com/react-data-grid/filter-set-filter-list/#refreshing-values) for more information.

The example below demonstrates Server-side Filtering using the Set Filter. Note the following:

- The **Country** and **Sport** columns have Set Filters defined using `filter: 'agSetColumnFilter'`.
- Set Filter values are fetched asynchronously and supplied via the `params.success(values)` callback.
- The filter for the **Country** column is using [complex objects](https://www.ag-grid.com/react-data-grid/filter-set-filter-list/#complex-objects). The country name is shown in the Filter List, but the `filterModel` (and request) use the country code.
- The filter for the **Sport** column only shows the values which are available for the selected countries. When the filter for the **Country** column is changed, the values for the **Sport** filter are updated.
- The server uses the metadata contained in the `filterModel` to filter the rows.
- Open the browser's dev console to view the `filterModel` supplied in the request to the datasource.

React Example - Server Side Model Filtering - Infinite Set

Country

Sport

Athlete

Hide filesViewing: index.jsx

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
import {
  ModuleRegistry,
  TextFilterModule,
  ValidationModule,
} from "ag-grid-community";
import {
  ColumnMenuModule,
  ContextMenuModule,
  MultiFilterModule,
  ServerSideRowModelModule,
  SetFilterModule,
} from "ag-grid-enterprise";
import { FakeServer } from "./fakeServer";

ModuleRegistry.registerModules([\
  ColumnMenuModule,\
  ContextMenuModule,\
  ServerSideRowModelModule,\
  SetFilterModule,\
  MultiFilterModule,\
  TextFilterModule,\
  ...(process.env.NODE_ENV !== "production" ? [ValidationModule] : []),\
]);

const countryCodeKeyCreator = (params) => {
  return params.value.code;
};

const countryValueFormatter = (params) => {
  return params.value.name;
};

const countryComparator = (a, b) => {
  // for complex objects, need to provide a comparator to choose what to sort by
  if (a.name < b.name) {
    return -1;
  } else if (a.name > b.name) {
    return 1;
  }
  return 0;
};

let fakeServer;

let selectedCountries = null;

let textFilterStored = null;

function areEqual(a, b) {
  if (a == null && b == null) {
    return true;
  }
  if (a != null || b != null) {
    return false;
  }
  return (
    a.length === b.length &&
    a.every(function (v, i) {
      return b[i] === v;
    })
  );
}

function getCountryValuesAsync(params) {
  const sportFilterModel = params.api.getFilterModel()["sport"];
  const countries = fakeServer.getCountries(sportFilterModel);
  // simulating real server call with a 500ms delay
  setTimeout(() => {
    params.success(countries);
  }, 500);
}

function getSportValuesAsync(params) {
  const sportFilterModel = params.api.getFilterModel()["sport"];
  const sports = fakeServer.getSports(selectedCountries, sportFilterModel);
  // simulating real server call with a 500ms delay
  setTimeout(() => {
    params.success(sports);
  }, 500);
}

const getServerSideDatasource = (server) => {
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

const GridExample = () => {
  const gridRef = useRef(null);
  const containerStyle = useMemo(() => ({ width: "100%", height: "100%" }), []);
  const gridStyle = useMemo(() => ({ height: "100%", width: "100%" }), []);

  const [columnDefs, setColumnDefs] = useState([\
    {\
      field: "country",\
      filter: "agSetColumnFilter",\
      valueFormatter: countryValueFormatter,\
      filterParams: {\
        values: getCountryValuesAsync,\
        keyCreator: countryCodeKeyCreator,\
        valueFormatter: countryValueFormatter,\
        comparator: countryComparator,\
        suppressClearModelOnRefreshValues: true,\
        buttons: ["apply"],\
      },\
    },\
    {\
      field: "sport",\
      filter: "agMultiColumnFilter",\
      filterParams: {\
        filters: [\
          {\
            filter: "agTextColumnFilter",\
            filterParams: {\
              defaultOption: "startsWith",\
            },\
          },\
          {\
            filter: "agSetColumnFilter",\
            filterParams: {\
              values: getSportValuesAsync,\
              suppressClearModelOnRefreshValues: true,\
            },\
          },\
        ],\
      },\
      menuTabs: ["filterMenuTab"],\
    },\
    { field: "athlete" },\
  ]);
  const defaultColDef = useMemo(() => {
    return {
      flex: 1,
      minWidth: 150,
      suppressHeaderMenuButton: true,
      suppressHeaderContextMenu: true,
    };
  }, []);

  const onGridReady = useCallback((params) => {
    fetch("https://www.ag-grid.com/example-assets/olympic-winners.json")
      .then((resp) => resp.json())
      .then((data) => {
        // we don't have unique codes in our dataset, so generate unique ones
        const namesToCodes = new Map();
        const codesToNames = new Map();
        data.forEach((row) => {
          row.countryName = row.country;
          if (namesToCodes.has(row.countryName)) {
            row.countryCode = namesToCodes.get(row.countryName);
          } else {
            row.countryCode = row.country.substring(0, 2).toUpperCase();
            if (codesToNames.has(row.countryCode)) {
              let num = 0;
              do {
                row.countryCode = `${row.countryCode[0]}${num++}`;
              } while (codesToNames.has(row.countryCode));
            }
            codesToNames.set(row.countryCode, row.countryName);
            namesToCodes.set(row.countryName, row.countryCode);
          }
          delete row.country;
        });
        // setup the fake server with entire dataset
        fakeServer = new FakeServer(data);
        // create datasource with a reference to the fake server
        const datasource = getServerSideDatasource(fakeServer);
        // register the datasource with the grid
        params.api.setGridOption("serverSideDatasource", datasource);
      });
  }, []);

  const onFilterChanged = useCallback(() => {
    const countryFilterModel = gridRef.current.api.getFilterModel()["country"];
    const sportFilterModel = gridRef.current.api.getFilterModel()["sport"];
    const selected = countryFilterModel && countryFilterModel.values;
    const textFilter = sportFilterModel?.filterModels[0]
      ? sportFilterModel.filterModels[0]
      : null;
    if (
      !areEqual(selectedCountries, selected) ||
      !areEqual(textFilterStored, textFilter)
    ) {
      selectedCountries = selected;
      textFilterStored = textFilter;
      console.log("Refreshing sports filter");
      // By default, the Multi Filter does not use a filter handler, so retrieve via `getColumnFilterInstance`.
      // If using `enableFilterHandlers = true`, the Multi Filter handler can be retrieved via `getColumnFilterHandler`.
      gridRef.current.api.getColumnFilterInstance("sport").then((filter) => {
        filter
          .getChildFilterInstance(1)
          .getFilterHandler()
          .refreshFilterValues();
      });
      gridRef.current.api
        .getColumnFilterHandler("country")
        .refreshFilterValues();
    }
  }, [textFilterStored]);

  return (
    <div style={containerStyle}>
      <div style={gridStyle}>
        <AgGridReact
          ref={gridRef}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          rowModelType={"serverSide"}
          cacheBlockSize={100}
          maxBlocksInCache={10}
          onGridReady={onGridReady}
          onFilterChanged={onFilterChanged}
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

## Batching Filter Requests [Copy Link](https://www.ag-grid.com/react-data-grid/server-side-model-filtering/#batching-filter-requests)

The [New Filters Tool Panel](https://www.ag-grid.com/react-data-grid/tool-panel-filters-new/) allows for filter changes to be batched together before a new `getRows` request is sent to the datasource.

This is possible by configuring the Filters Tool Panel to [Use Buttons](https://www.ag-grid.com/react-data-grid/tool-panel-filters-new/#using-buttons). Each filter can then be edited in the tool panel, and one request will be sent when the global apply button is clicked.

React Example - Server Side Model Filtering - Global Apply

Athlete

Filters

Add Filter

ResetApply

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
  ColumnMenuModule,
  ContextMenuModule,
  NewFiltersToolPanelModule,
  ServerSideRowModelModule,
  SideBarModule,
} from "ag-grid-enterprise";
import { FakeServer } from "./fakeServer";

ModuleRegistry.registerModules([\
  ColumnMenuModule,\
  ContextMenuModule,\
  ServerSideRowModelModule,\
  TextFilterModule,\
  NumberFilterModule,\
  SideBarModule,\
  NewFiltersToolPanelModule,\
  ...(process.env.NODE_ENV !== "production" ? [ValidationModule] : []),\
]);

const getServerSideDatasource = (server) => {
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

const GridExample = () => {
  const containerStyle = useMemo(() => ({ width: "100%", height: "100%" }), []);
  const gridStyle = useMemo(() => ({ height: "100%", width: "100%" }), []);

  const [columnDefs, setColumnDefs] = useState([\
    {\
      field: "athlete",\
      cellDataType: "text",\
      minWidth: 220,\
    },\
    { field: "year", cellDataType: "number" },\
    { field: "gold", cellDataType: "number" },\
    { field: "silver", cellDataType: "number" },\
    { field: "bronze", cellDataType: "number" },\
  ]);
  const defaultColDef = useMemo(() => {
    return {
      flex: 1,
      minWidth: 100,
      filter: true,
      filterParams: {
        buttons: ["apply"], // set all filters to use buttons
      },
      suppressHeaderMenuButton: true,
      suppressHeaderContextMenu: true,
    };
  }, []);
  const sideBar = useMemo(() => {
    return {
      toolPanels: [\
        {\
          id: "filters-new",\
          labelDefault: "Filters",\
          labelKey: "filters",\
          iconKey: "filter",\
          toolPanel: "agNewFiltersToolPanel",\
          toolPanelParams: {\
            buttons: ["reset", "apply"],\
          },\
        },\
      ],
      defaultToolPanel: "filters-new",
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
          rowModelType={"serverSide"}
          enableFilterHandlers={true}
          suppressSetFilterByDefault={true}
          sideBar={sideBar}
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

## Advanced Filter [Copy Link](https://www.ag-grid.com/react-data-grid/server-side-model-filtering/#advanced-filter)

In addition to Column Filters, the [Advanced Filter](https://www.ag-grid.com/react-data-grid/filter-advanced/) can also be used with the Server-Side Row Model. In this case, the `filterModel` in the request will be an [Advanced Filter Model](https://www.ag-grid.com/react-data-grid/filter-advanced/#filter-model--api) of type `AdvancedFilterModel | null`.

React Example - Server Side Model Filtering - Advanced Filter

Athlete

Year

Gold

Apply

Builder

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
  AdvancedFilterModule,
  ColumnMenuModule,
  ContextMenuModule,
  ServerSideRowModelModule,
} from "ag-grid-enterprise";
import { FakeServer } from "./fakeServer";

ModuleRegistry.registerModules([\
  TextFilterModule,\
  NumberFilterModule,\
  AdvancedFilterModule,\
  ColumnMenuModule,\
  ContextMenuModule,\
  ServerSideRowModelModule,\
  ...(process.env.NODE_ENV !== "production" ? [ValidationModule] : []),\
]);

const getServerSideDatasource = (server) => {
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

const GridExample = () => {
  const containerStyle = useMemo(() => ({ width: "100%", height: "100%" }), []);
  const gridStyle = useMemo(() => ({ height: "100%", width: "100%" }), []);

  const [columnDefs, setColumnDefs] = useState([\
    {\
      field: "athlete",\
      cellDataType: "text",\
      minWidth: 220,\
    },\
    {\
      field: "year",\
      cellDataType: "number",\
    },\
    {\
      field: "gold",\
      cellDataType: "number",\
    },\
    {\
      field: "silver",\
      cellDataType: "number",\
    },\
    {\
      field: "bronze",\
      cellDataType: "number",\
    },\
  ]);
  const defaultColDef = useMemo(() => {
    return {
      flex: 1,
      minWidth: 100,
      filter: true,
      suppressHeaderMenuButton: true,
      suppressHeaderContextMenu: true,
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
          rowModelType={"serverSide"}
          enableAdvancedFilter={true}
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

Note that [Cell Data Types](https://www.ag-grid.com/react-data-grid/cell-data-types/) must be supplied in order for the Advanced Filter to display the correct filter options, otherwise only `'text'` options will be displayed.

## Next Up [Copy Link](https://www.ag-grid.com/react-data-grid/server-side-model-filtering/#next-up)

Continue to the next section to learn about [SSRM Row Grouping](https://www.ag-grid.com/react-data-grid/server-side-model-grouping/).
