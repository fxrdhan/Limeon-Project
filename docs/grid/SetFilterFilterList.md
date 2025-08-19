This section describes how Filter List values can be managed through custom sorting and formatting. Supplying filter values directly to the Set Filter is also discussed.

## Sorting Filter Lists [Copy Link](https://www.ag-grid.com/react-data-grid/filter-set-filter-list/#sorting-filter-lists)

Values inside a Set Filter will be sorted by default, where the values are converted to a string value and sorted in ascending order according to their UTF-16 codes.

When a different sort order is required, a Comparator can be supplied to the set filter as shown below:

```jsx
const [columnDefs, setColumnDefs] = useState([\
    {\
        field: 'age',\
        filter: 'agSetColumnFilter',\
        filterParams: {\
            comparator: (a, b) => {\
                const valA = parseInt(a);\
                const valB = parseInt(b);\
                if (valA === valB) return 0;\
                return valA > valB ? 1 : -1;\
            }\
        }\
    }\
]);

<AgGridReact columnDefs={columnDefs} />
```

The Comparator used by the Set Filter is only provided the values in the first two parameters, whereas the Comparator for the Column Definition ( `colDef`) is also provided the row data as additional parameters. This is because when sorting rows, row data exists. For example, take 100 rows split across the colour values `[white, black]`. The column will be sorting 100 rows, however the filter will be only sorting two values.

If you are providing a Comparator that depends on the row data and you are using the Set Filter, be sure to provide the Set Filter with an alternative Comparator that doesn't depend on the row data.

The following example demonstrates sorting Set Filter values using a comparator. Note the following:

- The **Age (no Comparator)** filter values are sorted using the default string order: `1, 10, 100...`
- The **Age (with Comparator)** filter has a custom Comparator supplied in the `filterParams` that sorts the ages by numeric value: `1, 2, 3...`

React Example - Filter Set Filter List - Sorting Set Filter Values

Hide filesViewing: index.jsx

- index.jsx

Language:JavaScriptTypeScript

```jsx
"use client";

import React, { useCallback, useMemo, useState, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AgGridReact } from "ag-grid-react";
import {
  ClientSideRowModelModule,
  ModuleRegistry,
  ValidationModule,
} from "ag-grid-community";
import {
  ColumnMenuModule,
  ColumnsToolPanelModule,
  ContextMenuModule,
  FiltersToolPanelModule,
  SetFilterModule,
} from "ag-grid-enterprise";

ModuleRegistry.registerModules([\
  ClientSideRowModelModule,\
  ColumnsToolPanelModule,\
  FiltersToolPanelModule,\
  ColumnMenuModule,\
  ContextMenuModule,\
  SetFilterModule,\
  ...(process.env.NODE_ENV !== "production" ? [ValidationModule] : []),\
]);

const filterParams = {
  comparator: (a, b) => {
    const valA = a == null ? 0 : parseInt(a);
    const valB = b == null ? 0 : parseInt(b);
    if (valA === valB) return 0;
    return valA > valB ? 1 : -1;
  },
};

function getRowData() {
  const rows = [];
  for (let i = 1; i < 117; i++) {
    rows.push({ age: i });
  }
  return rows;
}

const GridExample = () => {
  const containerStyle = useMemo(() => ({ width: "100%", height: "100%" }), []);
  const gridStyle = useMemo(() => ({ height: "100%", width: "100%" }), []);
  const [rowData, setRowData] = useState(getRowData());
  const [columnDefs, setColumnDefs] = useState([\
    {\
      headerName: "Age (No Comparator)",\
      field: "age",\
      filter: "agSetColumnFilter",\
    },\
    {\
      headerName: "Age (With Comparator)",\
      field: "age",\
      filter: "agSetColumnFilter",\
      filterParams: filterParams,\
    },\
  ]);
  const defaultColDef = useMemo(() => {
    return {
      flex: 1,
      filter: true,
      cellDataType: false,
    };
  }, []);

  const onGridReady = useCallback((params) => {
    params.api.getToolPanelInstance("filters").expandFilters();
  }, []);

  return (
    <div style={containerStyle}>
      <div style={gridStyle}>
        <AgGridReact
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          sideBar={"filters"}
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

## Formatting Values [Copy Link](https://www.ag-grid.com/react-data-grid/filter-set-filter-list/#formatting-values)

This section covers different ways to format the displayed Filter List values in the Set Filter.

Formatting Filter List values will not change the underlying value or Filter Model.

### Value Formatter [Copy Link](https://www.ag-grid.com/react-data-grid/filter-set-filter-list/#value-formatter)

A [Value Formatter](https://www.ag-grid.com/react-data-grid/value-formatters/) is a good choice when the string value displayed in the Filter List needs to be modified, for example adding country codes in parentheses after a country name, as shown below:

```jsx
const countryValueFormatter = params => {
  const country = params.value;
  return country + ' (' + COUNTRY_CODES[country].toUpperCase() + ')';
};
```

The following snippet shows how to provide the `countryValueFormatter` to the Set Filter:

```jsx
const [columnDefs, setColumnDefs] = useState([\
    // column definition using the same value formatter to format cell and filter values\
    {\
        field: 'country',\
        valueFormatter: countryValueFormatter,\
        filter: 'agSetColumnFilter',\
        filterParams: {\
            valueFormatter: countryValueFormatter,\
        },\
    }\
]);

<AgGridReact columnDefs={columnDefs} />
```

In the code above, the same value formatter is supplied to the Column and Filter params, however separate Value Formatters can be used.

There is not a one-to-one mapping between Filter List items and rows (as values from multiple rows may map to the same Filter List item), so the Value Formatter for the Filter List will not be passed `node` or `data` params, and should just format based on the `value`.

If the data contains [Missing Values](https://www.ag-grid.com/react-data-grid/filter-set-filter-list/#missing-values), the Value Formatter will need to handle how to display the blank values (e.g. return `'(Blanks)'`).

The following example shows how Set Filter values are formatted using a Value Formatter. Note the following:

- **No Value Formatter** does not have a Value Formatter supplied to the Set Filter. The column is supplied a Value Formatter through `colDef.valueFormatter = countryValueFormatter`.
- **With Value Formatter** has the same Value Formatter supplied to the Column and Set Filter. The Set Filter is supplied the value formatter through `filterParams.valueFormatter = countryValueFormatter`.
- Click **Print Filter Model** with a filter applied and note the logged Filter Model (dev console) has not been modified.

Hide filesViewing: index.jsx

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
  ClientSideRowModelModule,
  ModuleRegistry,
  ValidationModule,
} from "ag-grid-community";
import {
  ColumnMenuModule,
  ColumnsToolPanelModule,
  ContextMenuModule,
  FiltersToolPanelModule,
  SetFilterModule,
} from "ag-grid-enterprise";

ModuleRegistry.registerModules([\
  ClientSideRowModelModule,\
  ColumnsToolPanelModule,\
  FiltersToolPanelModule,\
  ColumnMenuModule,\
  ContextMenuModule,\
  SetFilterModule,\
  ...(process.env.NODE_ENV !== "production" ? [ValidationModule] : []),\
]);

function countryValueFormatter(params) {
  const value = params.value;
  return value + " (" + COUNTRY_CODES[value].toUpperCase() + ")";
}

var COUNTRY_CODES = {
  Ireland: "ie",
  Luxembourg: "lu",
  Belgium: "be",
  Spain: "es",
  France: "fr",
  Germany: "de",
  Sweden: "se",
  Italy: "it",
  Greece: "gr",
  Iceland: "is",
  Portugal: "pt",
  Malta: "mt",
  Norway: "no",
  Brazil: "br",
  Argentina: "ar",
  Colombia: "co",
  Peru: "pe",
  Venezuela: "ve",
  Uruguay: "uy",
};

const GridExample = () => {
  const gridRef = useRef(null);
  const containerStyle = useMemo(() => ({ width: "100%", height: "100%" }), []);
  const gridStyle = useMemo(() => ({ height: "100%", width: "100%" }), []);
  const [rowData, setRowData] = useState();
  const [columnDefs, setColumnDefs] = useState([\
    {\
      headerName: "No Value Formatter",\
      field: "country",\
      valueFormatter: countryValueFormatter,\
      filter: "agSetColumnFilter",\
      filterParams: {\
        // no value formatter!\
      },\
    },\
    {\
      headerName: "With Value Formatter",\
      field: "country",\
      valueFormatter: countryValueFormatter,\
      filter: "agSetColumnFilter",\
      filterParams: {\
        valueFormatter: countryValueFormatter,\
      },\
    },\
  ]);
  const defaultColDef = useMemo(() => {
    return {
      flex: 1,
      minWidth: 225,
      floatingFilter: true,
    };
  }, []);

  const onGridReady = useCallback((params) => {
    fetch("https://www.ag-grid.com/example-assets/olympic-winners.json")
      .then((resp) => resp.json())
      .then((data) => {
        // only return data that has corresponding country codes
        const dataWithFlags = data.filter(function (d) {
          return COUNTRY_CODES[d.country];
        });
        setRowData(dataWithFlags);
      });
  }, []);

  const onFirstDataRendered = useCallback((params) => {
    params.api.getToolPanelInstance("filters").expandFilters();
  }, []);

  const printFilterModel = useCallback(() => {
    const filterModel = gridRef.current.api.getFilterModel();
    console.log(filterModel);
  }, []);

  return (
    <div style={containerStyle}>
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={{ paddingBottom: "5px" }}>
          <button onClick={printFilterModel}>Print Filter Model</button>
        </div>

        <div style={gridStyle}>
          <AgGridReact
            ref={gridRef}
            rowData={rowData}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            sideBar={"filters"}
            onGridReady={onGridReady}
            onFirstDataRendered={onFirstDataRendered}
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

### Cell Renderer [Copy Link](https://www.ag-grid.com/react-data-grid/filter-set-filter-list/#cell-renderer)

A [Cell Component](https://www.ag-grid.com/react-data-grid/component-cell-renderer/) is a good choice when the value displayed requires markup. For instance if a country flag image is to be shown alongside country names.

The same Cell Component can used to format the grid cells and filter values, or different components can be supplied to each. Note that the Cell Component will be supplied additional info when used to format cells inside the grid (as grid cells have row details that are not present for values inside a Filter List).

Assuming you have a custom Country Cell Component, the following snippet shows how to provide the `countryCellRenderer` to the Set Filter:

```jsx
const [columnDefs, setColumnDefs] = useState([\
    // column definition using the same cell renderer to format cell and filter values\
    {\
        field: 'country',\
        cellRenderer: countryCellRenderer,\
        filter: 'agSetColumnFilter',\
        filterParams: {\
            cellRenderer: countryCellRenderer\
        }\
    }\
]);

<AgGridReact columnDefs={columnDefs} />
```

A custom [Cell Renderer Component](https://www.ag-grid.com/react-data-grid/component-cell-renderer/) can also be supplied to `filterParams.cellRenderer`.

The following example shows how Set Filter values are rendered using a Cell Renderer. Note the following:

- **No Cell Renderer** does not have a Cell Renderer supplied to the Set Filter. The Column has a Cell Renderer supplied to the Column using `colDef.cellRenderer = countryCellRenderer`.
- **With Cell Renderer** uses the same Cell Renderer to format the cells and filter values. The Set Filter is supplied the Value Formatter using `filterParams.cellRenderer = countryCellRenderer`.
- Click **Print Filter Model** with a filter applied and note the logged filter model (dev console) has not been modified.

Hide filesViewing: index.jsx

- styles.css
- countryCellRenderer.jsx
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
  ClientSideRowModelModule,
  ModuleRegistry,
  ValidationModule,
} from "ag-grid-community";
import {
  ColumnMenuModule,
  ColumnsToolPanelModule,
  ContextMenuModule,
  FiltersToolPanelModule,
  SetFilterModule,
} from "ag-grid-enterprise";
import CountryCellRenderer from "./countryCellRenderer.jsx";

ModuleRegistry.registerModules([\
  ClientSideRowModelModule,\
  ColumnsToolPanelModule,\
  FiltersToolPanelModule,\
  ColumnMenuModule,\
  ContextMenuModule,\
  SetFilterModule,\
  ...(process.env.NODE_ENV !== "production" ? [ValidationModule] : []),\
]);

const COUNTRY_CODES = {
  Ireland: "ie",
  Luxembourg: "lu",
  Belgium: "be",
  Spain: "es",
  France: "fr",
  Germany: "de",
  Sweden: "se",
  Italy: "it",
  Greece: "gr",
  Iceland: "is",
  Portugal: "pt",
  Malta: "mt",
  Norway: "no",
  Brazil: "br",
  Argentina: "ar",
  Colombia: "co",
  Peru: "pe",
  Venezuela: "ve",
  Uruguay: "uy",
};

const GridExample = () => {
  const gridRef = useRef(null);
  const containerStyle = useMemo(() => ({ width: "100%", height: "100%" }), []);
  const gridStyle = useMemo(() => ({ height: "100%", width: "100%" }), []);
  const [rowData, setRowData] = useState();
  const [columnDefs, setColumnDefs] = useState([\
    {\
      headerName: "No Cell Renderer",\
      field: "country",\
      cellRenderer: CountryCellRenderer,\
      filter: "agSetColumnFilter",\
      filterParams: {\
        // no cell renderer!\
      },\
    },\
    {\
      headerName: "With Cell Renderers",\
      field: "country",\
      cellRenderer: CountryCellRenderer,\
      filter: "agSetColumnFilter",\
      filterParams: {\
        cellRenderer: CountryCellRenderer,\
        cellRendererParams: { isFilterRenderer: true },\
      },\
    },\
  ]);
  const context = useMemo(() => {
    return {
      COUNTRY_CODES: COUNTRY_CODES,
    };
  }, []);
  const defaultColDef = useMemo(() => {
    return {
      flex: 1,
      minWidth: 225,
      floatingFilter: true,
    };
  }, []);

  const onGridReady = useCallback((params) => {
    fetch("https://www.ag-grid.com/example-assets/olympic-winners.json")
      .then((resp) => resp.json())
      .then((data) => {
        // only return data that has corresponding country codes
        const dataWithFlags = data.filter(function (d) {
          return COUNTRY_CODES[d.country];
        });
        // Empty data used to demonstrate custom (Blanks) handling in filter cell renderer
        dataWithFlags[0].country = "";
        setRowData(dataWithFlags);
      });
  }, []);

  const onFirstDataRendered = useCallback((params) => {
    params.api.getToolPanelInstance("filters").expandFilters();
  }, []);

  const printFilterModel = useCallback(() => {
    const filterModel = gridRef.current.api.getFilterModel();
    console.log(filterModel);
  }, []);

  return (
    <div style={containerStyle}>
      <div className="example-wrapper">
        <div style={{ marginBottom: "5px" }}>
          <button onClick={printFilterModel}>Print Filter Model</button>
        </div>

        <div style={gridStyle}>
          <AgGridReact
            ref={gridRef}
            rowData={rowData}
            columnDefs={columnDefs}
            context={context}
            defaultColDef={defaultColDef}
            sideBar={"filters"}
            onGridReady={onGridReady}
            onFirstDataRendered={onFirstDataRendered}
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

## Supplying Filter Values [Copy Link](https://www.ag-grid.com/react-data-grid/filter-set-filter-list/#supplying-filter-values)

The Set Filter will obtain the filter values from the row data by default. These are retrieved from the data based on the `field` attribute. This can be overridden by providing a `filterValueGetter` in the Column Definition. This is similar to using a [Value Getter](https://www.ag-grid.com/react-data-grid/value-getters/), but is specific to the filter.

|                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| filterValueGetter [Copy Link](https://www.ag-grid.com/react-data-grid/filter-set-filter-list/#reference-filtering-filterValueGetter)<br>string \| ValueGetterFunc<br>Function or [expression](https://www.ag-grid.com/react-data-grid/cell-expressions/#column-definition-expressions). Gets the value for filtering purposes. |

It is also possible to provide values for the Filter List. This is necessary when using the [Server-Side Row Model](https://www.ag-grid.com/react-data-grid/server-side-model/). This can be done either synchronously or asynchronously as described below.

### Synchronous Values [Copy Link](https://www.ag-grid.com/react-data-grid/filter-set-filter-list/#synchronous-values)

The simplest approach is to supply a list of values to `filterParams.values` as shown below:

```jsx
const [columnDefs, setColumnDefs] = useState([\
    {\
        field: 'days',\
        filter: 'agSetColumnFilter',\
        filterParams: {\
            // provide all days, even if days are missing in data!\
            values: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']\
        }\
    }\
]);

<AgGridReact columnDefs={columnDefs} />
```

Note that if there are missing values in the row data, the filter list will display all provided values. This could give users the impression that filtering is broken.

When providing filter values which are already sorted it is often useful to disable the default filter list sorting using `filterParams.suppressSorting=true`.

The following example demonstrates providing filter values using `filterParams.values`. Note the following:

- The **Days (Values Not Provided)** set filter obtains values from the row data to populate the filter list and as `'Saturday'` and `'Sunday'` are not present in the data they do not appear in the filter list.
- As the **Days (Values Not Provided)** filter values come from the row data they are sorted using a [Custom Sort Comparator](https://www.ag-grid.com/react-data-grid/filter-set-filter-list/#sorting-filter-lists) to ensure the days are ordered according to the week day.
- The **Days (Values Provided)** set filter is given values using `filterParams.values`. As all days are supplied the filter list also contains `'Saturday'` and `'Sunday'`.
- As the **Days (Values Provided)** filter values are provided in the correct order, the default filter list sorting is turned off using: `filterParams.suppressSorting=true`.

Hide filesViewing: index.jsx

- index.jsx

Language:JavaScriptTypeScript

```jsx
"use client";

import React, { useCallback, useMemo, useState, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AgGridReact } from "ag-grid-react";
import {
  ClientSideRowModelModule,
  ModuleRegistry,
  ValidationModule,
} from "ag-grid-community";
import {
  ColumnMenuModule,
  ColumnsToolPanelModule,
  ContextMenuModule,
  FiltersToolPanelModule,
  SetFilterModule,
} from "ag-grid-enterprise";

ModuleRegistry.registerModules([\
  ClientSideRowModelModule,\
  ColumnsToolPanelModule,\
  FiltersToolPanelModule,\
  ColumnMenuModule,\
  ContextMenuModule,\
  SetFilterModule,\
  ...(process.env.NODE_ENV !== "production" ? [ValidationModule] : []),\
]);

const listOfDays = [\
  "Monday",\
  "Tuesday",\
  "Wednesday",\
  "Thursday",\
  "Friday",\
  "Saturday",\
  "Sunday",\
];

const daysValuesNotProvidedFilterParams = {
  comparator: (a, b) => {
    const aIndex = a == null ? -1 : listOfDays.indexOf(a);
    const bIndex = b == null ? -1 : listOfDays.indexOf(b);
    if (aIndex === bIndex) return 0;
    return aIndex > bIndex ? 1 : -1;
  },
};

const daysValuesProvidedFilterParams = {
  values: listOfDays,
  suppressSorting: true, // use provided order
};

function getRowData() {
  const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const rows = [];
  for (let i = 0; i < 200; i++) {
    const index = Math.floor(Math.random() * 5);
    rows.push({ days: weekdays[index] });
  }
  return rows;
}

const GridExample = () => {
  const containerStyle = useMemo(() => ({ width: "100%", height: "100%" }), []);
  const gridStyle = useMemo(() => ({ height: "100%", width: "100%" }), []);
  const [rowData, setRowData] = useState(getRowData());
  const [columnDefs, setColumnDefs] = useState([\
    {\
      headerName: "Days (Values Not Provided)",\
      field: "days",\
      filter: "agSetColumnFilter",\
      filterParams: daysValuesNotProvidedFilterParams,\
    },\
    {\
      headerName: "Days (Values Provided)",\
      field: "days",\
      filter: "agSetColumnFilter",\
      filterParams: daysValuesProvidedFilterParams,\
    },\
  ]);
  const defaultColDef = useMemo(() => {
    return {
      flex: 1,
      filter: true,
    };
  }, []);

  const onFirstDataRendered = useCallback((params) => {
    params.api.getToolPanelInstance("filters").expandFilters();
  }, []);

  return (
    <div style={containerStyle}>
      <div style={gridStyle}>
        <AgGridReact
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          sideBar={"filters"}
          onFirstDataRendered={onFirstDataRendered}
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

### Asynchronous Values [Copy Link](https://www.ag-grid.com/react-data-grid/filter-set-filter-list/#asynchronous-values)

It is also possible to supply values asynchronously to the set filter. This is done by providing a callback function instead of a list of values as shown below:

```jsx
const [columnDefs, setColumnDefs] = useState([\
    {\
        filter: 'agSetColumnFilter',\
        filterParams: {\
            values: params => {\
                // async update simulated using setTimeout()\
                setTimeout(() => {\
                    // fetch values from server\
                    const values = getValuesFromServer();\
                    // supply values to the set filter\
                    params.success(values);\
                }, 3000);\
            }\
        }\
    }\
]);

<AgGridReact columnDefs={columnDefs} />
```

Note in the snippet above the values callback receives a parameter object which contains `params.success()` which allows values obtained asynchronously to be supplied to the set filter.

The interface for this parameter object is `SetFilterValuesFuncParams`:

|                                                                                                                                                                                                                                                                       |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| success [Copy Link](https://www.ag-grid.com/react-data-grid/filter-set-filter-list/#reference-SetFilterValuesFuncParams-success)<br>Function<br>The function to call with the values to load into the filter once they are ready.                                     |
| colDef [Copy Link](https://www.ag-grid.com/react-data-grid/filter-set-filter-list/#reference-SetFilterValuesFuncParams-colDef)<br>[ColDef](https://www.ag-grid.com/react-data-grid/column-properties/)<br>The column definition from which the set filter is invoked. |
| column [Copy Link](https://www.ag-grid.com/react-data-grid/filter-set-filter-list/#reference-SetFilterValuesFuncParams-column)<br>[Column](https://www.ag-grid.com/react-data-grid/column-object/)<br>Column from which the set filter is invoked.                    |
| api [Copy Link](https://www.ag-grid.com/react-data-grid/filter-set-filter-list/#reference-SetFilterValuesFuncParams-api)<br>[GridApi](https://www.ag-grid.com/react-data-grid/grid-api/)<br>The grid api.                                                             |
| context [Copy Link](https://www.ag-grid.com/react-data-grid/filter-set-filter-list/#reference-SetFilterValuesFuncParams-context)<br>any<br>Application context as set on `gridOptions.context`.                                                                       |

If you are providing values to the Set Filter asynchronously, when setting the model using `setModel` you need to wait for changes to be applied before performing any further actions by waiting on the returned grid promise, e.g.

`filter.setModel({ values: ['a', 'b'] }).then(() => gridApi.onFilterChanged(); );`

The following example demonstrates loading set filter values asynchronously. Note the following:

- `filterParams.values` is assigned a callback function that loads the filter values after a 3 second delay using the callback supplied in the params: `params.success(['value1', 'value2'])`.
- Opening the set filter shows a loading message before the values are set. See the [Localisation](https://www.ag-grid.com/react-data-grid/localisation/) section for details on how to change this message.
- The callback is only invoked the first time the filter is opened. The next time the filter is opened the values are not loaded again.

React Example - Filter Set Filter List - Callback Async

Hide filesViewing: index.jsx

- index.jsx

Language:JavaScriptTypeScript

```jsx
"use client";

import React, { useMemo, useState, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AgGridReact } from "ag-grid-react";
import {
  ClientSideRowModelModule,
  ModuleRegistry,
  ValidationModule,
} from "ag-grid-community";
import {
  ColumnMenuModule,
  ColumnsToolPanelModule,
  ContextMenuModule,
  FiltersToolPanelModule,
  SetFilterModule,
} from "ag-grid-enterprise";

ModuleRegistry.registerModules([\
  ClientSideRowModelModule,\
  ColumnsToolPanelModule,\
  FiltersToolPanelModule,\
  ColumnMenuModule,\
  ContextMenuModule,\
  SetFilterModule,\
  ...(process.env.NODE_ENV !== "production" ? [ValidationModule] : []),\
]);

const filterParams = {
  values: (params) => {
    setTimeout(() => {
      params.success(["value 1", "value 2"]);
    }, 3000);
  },
};

const GridExample = () => {
  const containerStyle = useMemo(() => ({ width: "100%", height: "100%" }), []);
  const gridStyle = useMemo(() => ({ height: "100%", width: "100%" }), []);
  const [rowData, setRowData] = useState([\
    { value: "value 1" },\
    { value: "value 1" },\
    { value: "value 1" },\
    { value: "value 1" },\
    { value: "value 2" },\
    { value: "value 2" },\
    { value: "value 2" },\
    { value: "value 2" },\
    { value: "value 2" },\
  ]);
  const [columnDefs, setColumnDefs] = useState([\
    {\
      headerName: "Set filter column",\
      field: "value",\
      flex: 1,\
      filter: "agSetColumnFilter",\
      floatingFilter: true,\
      filterParams: filterParams,\
    },\
  ]);

  return (
    <div style={containerStyle}>
      <div style={gridStyle}>
        <AgGridReact rowData={rowData} columnDefs={columnDefs} />
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

### Refreshing Values [Copy Link](https://www.ag-grid.com/react-data-grid/filter-set-filter-list/#refreshing-values)

When values are initially passed to the set filter, they are only loaded once when the set filter is initially created. When those values are updated via `filterParams.values`, the set filter will automatically update to reflect the new values.

It may be desirable to refresh the values at a later point, for example to reflect other filtering that has occurred in the grid. To achieve this, you can call `refreshFilterValues` on the relevant filter that you would like to refresh. This will cause the values used in the filter to be refreshed from the original source, whether that is by looking at the provided `values` array again, or by re-executing the `values` callback. For example, you might use something like the following:

```jsx
const onFilterChanged = params => {
  params.api.getColumnFilterHandler('columnName').refreshFilterValues();
};

<AgGridReact onFilterChanged={onFilterChanged} />;
```

If you are using the grid as a source of values (i.e. you are not providing values yourself), calling this method will also refresh the filter values using values taken from the grid, but this should not be necessary as the values are automatically refreshed for you whenever any data changes in the grid.

If instead you want to refresh the values every time the Set Filter is opened, you can configure that using `refreshValuesOnOpen`:

```jsx
const [columnDefs, setColumnDefs] = useState([\
    {\
        filter: 'agSetColumnFilter',\
        filterParams: {\
            values: params => params.success(getValuesFromServer()),\
            refreshValuesOnOpen: true,\
        }\
    }\
]);

<AgGridReact columnDefs={columnDefs} />
```

When you refresh the values, any values that were selected in the filter that still exist in the new values will stay selected, but any other selected values will be discarded.

Additionally, if all the new values are selected (and the filter was previously active), the filter model will be cleared (reset to `null`). This behaviour can be prevented by setting the filter param `suppressClearModelOnRefreshValues = true`. This can be useful if using [Server-Side Row Model Filtering](https://www.ag-grid.com/react-data-grid/server-side-model-filtering/#set-filtering) and updating the filter values based on other column filters

The following example demonstrates refreshing values. Note the following:

- The Values Array column has values provided as an array. Clicking the buttons to change the values will update the values in the array provided to the filter and call `refreshFilterValues()` to immediately refresh the filter for the column.
- The Values Callback column has values provided as a callback and is configured with `'refreshValuesOnOpen = true'`. Clicking the buttons to change the values will update the values that will be returned the next time the callback is called. Note that the values are not updated until the next time the filter is opened.
- If you select `'Elephant'` and change the values, it will stay selected as it is present in both lists.
- If you select any of the other options, that selection will be lost when you change to different values.
- A filter is re-applied after values have been refreshed.

Hide filesViewing: index.jsx

- styles.css
- data.jsx
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
  ClientSideRowModelModule,
  ModuleRegistry,
  ValidationModule,
} from "ag-grid-community";
import {
  ColumnMenuModule,
  ColumnsToolPanelModule,
  ContextMenuModule,
  FiltersToolPanelModule,
  SetFilterModule,
} from "ag-grid-enterprise";
import { getData } from "./data";

ModuleRegistry.registerModules([\
  ClientSideRowModelModule,\
  ColumnsToolPanelModule,\
  FiltersToolPanelModule,\
  ColumnMenuModule,\
  ContextMenuModule,\
  SetFilterModule,\
  ...(process.env.NODE_ENV !== "production" ? [ValidationModule] : []),\
]);

const list1 = ["Elephant", "Lion", "Monkey"];

const list2 = ["Elephant", "Giraffe", "Tiger"];

const valuesArray = list1.slice();

let valuesCallbackList = list1;

function valuesCallback(params) {
  setTimeout(() => {
    params.success(valuesCallbackList);
  }, 1000);
}

const arrayFilterParams = {
  values: valuesArray,
};

const callbackFilterParams = {
  values: valuesCallback,
  refreshValuesOnOpen: true,
};

const GridExample = () => {
  const gridRef = useRef(null);
  const containerStyle = useMemo(() => ({ width: "100%", height: "100%" }), []);
  const gridStyle = useMemo(() => ({ height: "100%", width: "100%" }), []);
  const [rowData, setRowData] = useState(getData());
  const [columnDefs, setColumnDefs] = useState([\
    {\
      colId: "array",\
      headerName: "Values Array",\
      field: "animal",\
      filter: "agSetColumnFilter",\
      filterParams: arrayFilterParams,\
    },\
    {\
      colId: "callback",\
      headerName: "Values Callback",\
      field: "animal",\
      filter: "agSetColumnFilter",\
      filterParams: callbackFilterParams,\
    },\
  ]);
  const defaultColDef = useMemo(() => {
    return {
      flex: 1,
      filter: true,
    };
  }, []);

  const onFirstDataRendered = useCallback((params) => {
    params.api.getToolPanelInstance("filters").expandFilters();
  }, []);

  const useList1 = useCallback(() => {
    console.log("Updating values to " + list1);
    valuesArray.length = 0;
    list1.forEach((value) => {
      valuesArray.push(value);
    });
    gridRef.current.api.getColumnFilterHandler("array").refreshFilterValues();
    valuesCallbackList = list1;
  }, [list1, valuesArray]);

  const useList2 = useCallback(() => {
    console.log("Updating values to " + list2);
    valuesArray.length = 0;
    list2.forEach((value) => {
      valuesArray.push(value);
    });
    gridRef.current.api.getColumnFilterHandler("array").refreshFilterValues();
    valuesCallbackList = list2;
  }, [list2, valuesArray]);

  return (
    <div style={containerStyle}>
      <div id="container">
        <div id="header">
          <button onClick={useList1}>
            Use <code>['Elephant', 'Lion', 'Monkey']</code>
          </button>
          <button onClick={useList2}>
            Use <code>['Elephant', 'Giraffe', 'Tiger']</code>
          </button>
        </div>

        <div style={gridStyle}>
          <AgGridReact
            ref={gridRef}
            rowData={rowData}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            sideBar={"filters"}
            onFirstDataRendered={onFirstDataRendered}
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

## Enabling Value Case-Sensitivity [Copy Link](https://www.ag-grid.com/react-data-grid/filter-set-filter-list/#enabling-value-case-sensitivity)

By default the Set Filter treats values as case-insensitive. Practically this means that cell values of `Black`, `black` and `BLACK` are all treated as identical for matching purposes, and the first encountered value is used as the value displayed in the Filter List.

Case-sensitivity can be enabled by using the `caseSensitive` filter parameter:

```jsx
const [columnDefs, setColumnDefs] = useState([\
    {\
        field: 'colour',\
        filter: 'agSetColumnFilter',\
        filterParams: {\
            caseSensitive: true\
        }\
    }\
]);

<AgGridReact columnDefs={columnDefs} />
```

The `caseSensitive` option also affects [Mini-Filter](https://www.ag-grid.com/react-data-grid/filter-set-mini-filter/#enabling-case-sensitive-searches) searches and [API](https://www.ag-grid.com/react-data-grid/filter-set-api/#enabling-case-sensitivity) behaviours.

The following example demonstrates the difference in behaviour between `caseSensitive: false` (the default) and `caseSensitive: true`:

- The case insensitive column's Filter List has seven distinct values with unique colours.
  - Typing `black` into the Mini Filter will match `Black`.
- The case sensitive column's Filter List has 21 distinct values, although there are only seven distinct colours ignoring case.
  - Typing `black` into the Mini Filter will match only `black`, but not `Black` or `BLACK`.

React Example - Filter Set Filter List - Case Sensitive Set Filter List

Hide filesViewing: index.jsx

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
  ModuleRegistry,
  ValidationModule,
} from "ag-grid-community";
import {
  ColumnMenuModule,
  ColumnsToolPanelModule,
  ContextMenuModule,
  FiltersToolPanelModule,
  SetFilterModule,
} from "ag-grid-enterprise";
import { AgGridReact } from "ag-grid-react";

ModuleRegistry.registerModules([\
  ClientSideRowModelModule,\
  SetFilterModule,\
\
  ColumnMenuModule,\
  ContextMenuModule,\
  ColumnsToolPanelModule,\
  FiltersToolPanelModule,\
  ...(process.env.NODE_ENV !== "production" ? [ValidationModule] : []),\
]);

const colourCellRenderer = (props) => {
  if (!props.value || props.value === "(Select All)") {
    return props.value;
  }

  const styles = {
    verticalAlign: "middle",
    border: "1px solid black",
    margin: 3,
    display: "inline-block",
    width: 10,
    height: 10,
    backgroundColor: props.value.toLowerCase(),
  };
  return (
    <React.Fragment>
      <div style={styles} />
      {props.value}
    </React.Fragment>
  );
};

const GridExample = () => {
  const gridRef = useRef(null);
  const containerStyle = useMemo(() => ({ width: "100%", height: "100%" }), []);
  const gridStyle = useMemo(() => ({ height: "100%", width: "100%" }), []);
  const [rowData, setRowData] = useState([\
    { colour: "Black" },\
    { colour: "BLACK" },\
    { colour: "black" },\
    { colour: "Red" },\
    { colour: "RED" },\
    { colour: "red" },\
    { colour: "Orange" },\
    { colour: "ORANGE" },\
    { colour: "orange" },\
    { colour: "White" },\
    { colour: "WHITE" },\
    { colour: "white" },\
    { colour: "Yellow" },\
    { colour: "YELLOW" },\
    { colour: "yellow" },\
    { colour: "Green" },\
    { colour: "GREEN" },\
    { colour: "green" },\
    { colour: "Purple" },\
    { colour: "PURPLE" },\
    { colour: "purple" },\
  ]);
  const [columnDefs, setColumnDefs] = useState([\
    {\
      headerName: "Case Insensitive (default)",\
      field: "colour",\
      filter: "agSetColumnFilter",\
      filterParams: {\
        caseSensitive: false,\
        cellRenderer: colourCellRenderer,\
      },\
    },\
    {\
      headerName: "Case Sensitive",\
      field: "colour",\
      filter: "agSetColumnFilter",\
      filterParams: {\
        caseSensitive: true,\
        cellRenderer: colourCellRenderer,\
      },\
    },\
  ]);
  const defaultColDef = useMemo(() => {
    return {
      flex: 1,
      minWidth: 225,
      cellRenderer: colourCellRenderer,
      floatingFilter: true,
    };
  }, []);

  const onFirstDataRendered = useCallback((params) => {
    gridRef.current.api.getToolPanelInstance("filters").expandFilters();
  }, []);

  return (
    <div style={containerStyle}>
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={gridStyle}>
          <AgGridReact
            ref={gridRef}
            rowData={rowData}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            sideBar={"filters"}
            onFirstDataRendered={onFirstDataRendered}
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

If case differences need to be normalised to remove redundant values from the data-source for filtering, a [Value Formatter](https://www.ag-grid.com/react-data-grid/filter-set-filter-list/#value-formatter) should be used.

## Missing Values [Copy Link](https://www.ag-grid.com/react-data-grid/filter-set-filter-list/#missing-values)

If there are missing / empty values in the row data of the grid, or missing values in the list of [Supplied Values](https://www.ag-grid.com/react-data-grid/filter-set-filter-list/#supplying-filter-values), the Filter List will contain an entry called `(Blanks)` which can be used to select / deselect all of these values. If this not the desired behaviour, provide a [Formatter](https://www.ag-grid.com/react-data-grid/filter-set-filter-list/#value-formatter) to present blank values in a different way.

`undefined`, `null` and `''`, as well as an empty array if using [Multiple Values Per Cell](https://www.ag-grid.com/react-data-grid/filter-set-filter-list/#multiple-values-per-cell), are all treated as missing values. These will appear within the [Set Filter Model](https://www.ag-grid.com/react-data-grid/filter-set-api/#set-filter-model) as a single entry of `null`. This also applies to supplied Filter List values (e.g. if you supply `''` it will appear in the filter model as `null`), as well as when setting the Filter Model via the API.

## Filter Value Types [Copy Link](https://www.ag-grid.com/react-data-grid/filter-set-filter-list/#filter-value-types)

The Set Filter internally maintains the original type of the cell values, but always uses strings for the keys. E.g. if the cell contains a number, the Filter Model will contain those numbers converted to strings, but if you specified a value formatter, that would use the values with type number.

### Complex Objects [Copy Link](https://www.ag-grid.com/react-data-grid/filter-set-filter-list/#complex-objects)

If you are providing complex objects as values, then you need to provide both a Key Creator function and a Value Formatter function when using the Set Filter.

The Key Creator generates a unique string key from the complex object (note that if the key is `null`, `undefined` or `''` it will be converted to `null`, the same as for [Missing Values](https://www.ag-grid.com/react-data-grid/filter-set-filter-list/#missing-values)). This key is used within the Filter Model, and to compare objects. You can either provide a Key Creator within the filter params, which will be specific to the Set Filter, or you can provide one in the Column Definition that is shared with other features such as grouping.

The Value Formatter is used to generate the label that is displayed to the user within the Filter List. You can provide the Value Formatter in the filter params.

```jsx
const [columnDefs, setColumnDefs] = useState([\
    {\
        field: 'country',\
        filter: 'agSetColumnFilter',\
        filterParams: {\
            keyCreator: params => params.value.code,\
            valueFormatter: params => params.value.name,\
        },\
    }\
]);

<AgGridReact columnDefs={columnDefs} />
```

The snippet above shows a Key Creator function that returns the country code from the complex object, and a Value Formatter that returns the name. If the Key Creator or Value Formatter were not provided at all, the Set Filter would not work.

If [Supplied Values](https://www.ag-grid.com/react-data-grid/filter-set-filter-list/#supplying-filter-values) are used for the Filter List, these must be the full complex objects.

The following example shows the Key Creator handling complex objects for the Set Filter. Note the following:

- **Country** column is supplied a complex object through `colDef.field`.
  - A Key Creator is supplied to the filter using `colDef.filterParams.keyCreator = countryCodeKeyCreator` which extracts the `code` property for the Set Filter.
  - A value formatter is supplied to the filter using `colDef.filterParams.valueFormatter = countryValueFormatter` which extracts the `name` property for the Filter List.
  - A value formatter is supplied to the column using `colDef.valueFormatter = countryValueFormatter` which extracts the `name` property for the cell values.
- Click **Print Filter Model** with a filter active on **Country** and note the logged Filter Model (dev console) uses the `code` property from the complex object.

Hide filesViewing: index.jsx

- styles.css
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
  ClientSideRowModelModule,
  ModuleRegistry,
  ValidationModule,
} from "ag-grid-community";
import {
  ColumnMenuModule,
  ColumnsToolPanelModule,
  ContextMenuModule,
  FiltersToolPanelModule,
  SetFilterModule,
} from "ag-grid-enterprise";

ModuleRegistry.registerModules([\
  ClientSideRowModelModule,\
  ColumnsToolPanelModule,\
  FiltersToolPanelModule,\
  ColumnMenuModule,\
  ContextMenuModule,\
  SetFilterModule,\
  ...(process.env.NODE_ENV !== "production" ? [ValidationModule] : []),\
]);

function countryCodeKeyCreator(params) {
  const countryObject = params.value;
  return countryObject.code;
}

function countryValueFormatter(params) {
  return params.value.name;
}

const GridExample = () => {
  const gridRef = useRef(null);
  const containerStyle = useMemo(() => ({ width: "100%", height: "100%" }), []);
  const gridStyle = useMemo(() => ({ height: "100%", width: "100%" }), []);
  const [rowData, setRowData] = useState();
  const [columnDefs, setColumnDefs] = useState([\
    {\
      headerName: "Country",\
      field: "country",\
      valueFormatter: countryValueFormatter,\
      filter: "agSetColumnFilter",\
      filterParams: {\
        valueFormatter: countryValueFormatter,\
        keyCreator: countryCodeKeyCreator,\
      },\
    },\
  ]);
  const defaultColDef = useMemo(() => {
    return {
      flex: 1,
      floatingFilter: true,
      cellDataType: false,
    };
  }, []);

  const onGridReady = useCallback((params) => {
    fetch("https://www.ag-grid.com/example-assets/olympic-winners.json")
      .then((resp) => resp.json())
      .then((data) => {
        // hack the data, replace each country with an object of country name and code.
        // also make country codes unique
        const uniqueCountryCodes = new Map();
        const newData = [];
        data.forEach(function (row) {
          const countryName = row.country;
          const countryCode = countryName.substring(0, 2).toUpperCase();
          const uniqueCountryName = uniqueCountryCodes.get(countryCode);
          if (!uniqueCountryName || uniqueCountryName === countryName) {
            uniqueCountryCodes.set(countryCode, countryName);
            row.country = {
              name: countryName,
              code: countryCode,
            };
            newData.push(row);
          }
        });
        setRowData(newData);
      });
  }, []);

  const onFirstDataRendered = useCallback((params) => {
    params.api.getToolPanelInstance("filters").expandFilters();
  }, []);

  const printFilterModel = useCallback(() => {
    const filterModel = gridRef.current.api.getFilterModel();
    console.log(filterModel);
  }, []);

  return (
    <div style={containerStyle}>
      <div className="example-wrapper">
        <div style={{ marginBottom: "5px" }}>
          <button onClick={printFilterModel}>Print Filter Model</button>
        </div>

        <div style={gridStyle}>
          <AgGridReact
            ref={gridRef}
            rowData={rowData}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            sideBar={"filters"}
            onGridReady={onGridReady}
            onFirstDataRendered={onFirstDataRendered}
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

## Multiple Values Per Cell [Copy Link](https://www.ag-grid.com/react-data-grid/filter-set-filter-list/#multiple-values-per-cell)

Sometimes you might wish to support multiple values in a single cell, for example when using tags. In this case, the Set Filter can extract each of the individual values from the cells, creating an entry in the Filter List for each individual value. Selecting a value will then show rows where any of the values in the cell match the selected value.

The example below demonstrates this in action. Note the following:

- The **Animals (array)** column uses an array in the data containing multiple values.
- The **Animals (string)** column uses a single string in the data to represent multiple values, with a [Value Getter](https://www.ag-grid.com/react-data-grid/value-getters/) used to extract an array of values from the data.
- The **Animals (objects)** column retrieves values from an array of objects, using a [Key Creator](https://www.ag-grid.com/react-data-grid/filter-set-filter-list/#complex-objects). The Key Creator is applied to the elements within the array (as is the Value Formatter).
- For all scenarios, the Set Filter displays a list of all the individual, unique values present from the data.
- Selecting values in the Set Filter will show rows where the data for that row contains **any** of the selected values.
- The first row contains empty arrays for the **Animals (array)** and **Animals (objects)** columns, and an empty string for the **Animals (string)** column which is converted to an empty array. These all appear in the Filter List as `(Blanks)`.

Hide filesViewing: index.jsx

- data.jsx
- index.jsx

Language:JavaScriptTypeScript

```jsx
"use client";

import React, { useMemo, useState, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AgGridReact } from "ag-grid-react";
import {
  ClientSideRowModelModule,
  ModuleRegistry,
  ValidationModule,
} from "ag-grid-community";
import {
  ColumnMenuModule,
  ColumnsToolPanelModule,
  ContextMenuModule,
  FiltersToolPanelModule,
  SetFilterModule,
} from "ag-grid-enterprise";
import { getData } from "./data";

ModuleRegistry.registerModules([\
  ClientSideRowModelModule,\
  ColumnsToolPanelModule,\
  FiltersToolPanelModule,\
  ColumnMenuModule,\
  ContextMenuModule,\
  SetFilterModule,\
  ...(process.env.NODE_ENV !== "production" ? [ValidationModule] : []),\
]);

const valueGetter = function (params) {
  return params.data["animalsString"].split("|");
};

const valueFormatter = function (params) {
  return params.value
    .map(function (animal) {
      return animal.name;
    })
    .join(", ");
};

const GridExample = () => {
  const containerStyle = useMemo(() => ({ width: "100%", height: "100%" }), []);
  const gridStyle = useMemo(() => ({ height: "100%", width: "100%" }), []);
  const [rowData, setRowData] = useState(getData());
  const [columnDefs, setColumnDefs] = useState([\
    {\
      headerName: "Animals (array)",\
      field: "animalsArray",\
      filter: "agSetColumnFilter",\
    },\
    {\
      headerName: "Animals (string)",\
      filter: "agSetColumnFilter",\
      valueGetter: valueGetter,\
    },\
    {\
      headerName: "Animals (objects)",\
      field: "animalsObjects",\
      filter: "agSetColumnFilter",\
      valueFormatter: valueFormatter,\
      keyCreator: (params) => params.value.name,\
      filterParams: {\
        valueFormatter: (params) =>\
          params.value ? params.value.name : "(Blanks)",\
      },\
    },\
  ]);
  const defaultColDef = useMemo(() => {
    return {
      flex: 1,
      cellDataType: false,
    };
  }, []);

  return (
    <div style={containerStyle}>
      <div style={gridStyle}>
        <AgGridReact
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          sideBar={"filters"}
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

If the cell value contains an array, [Cell Data Types](https://www.ag-grid.com/react-data-grid/cell-data-types/) will automatically infer the type as `'object'` and provide a `comparator` that uses the column/data type value formatter. As the cell value type (the array) and filter value type (the content of the array) are different, an additional `comparator` needs to be provided for the Set Filter in the `filterParams` as described in [Sorting Filter Lists](https://www.ag-grid.com/react-data-grid/filter-set-filter-list/#sorting-filter-lists) above.

## Default State [Copy Link](https://www.ag-grid.com/react-data-grid/filter-set-filter-list/#default-state)

By default, when the Set Filter is created all values are selected. If you would prefer to invert this behaviour and have everything de-selected by default, you can use the following:

```jsx
const [columnDefs, setColumnDefs] = useState([\
    {\
        field: 'country',\
        filter: 'agSetColumnFilter',\
        filterParams: {\
            defaultToNothingSelected: true,\
        }\
    }\
]);

<AgGridReact columnDefs={columnDefs} />
```

In this case, no filtering will occur until at least one value is selected.

Note that the default state cannot be changed if [Excel Mode](https://www.ag-grid.com/react-data-grid/filter-set-excel-mode/) is enabled.

The following example demonstrates different default states. Note the following:

- The Athlete column has everything selected when the Set Filter is first opened, which is the default
- The Country column has nothing selected by default, as `defaultToNothingSelected = true`.
- When the Set Filter for the Country column is opened, the grid is not filtered until at least one value has been selected.

Hide filesViewing: index.jsx

- index.jsx
- useFetchJson.jsx

Language:JavaScriptTypeScript

```jsx
"use client";

import React, { useMemo, useState, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AgGridReact } from "ag-grid-react";
import {
  ClientSideRowModelModule,
  ModuleRegistry,
  NumberFilterModule,
  ValidationModule,
} from "ag-grid-community";
import {
  ColumnMenuModule,
  ColumnsToolPanelModule,
  ContextMenuModule,
  FiltersToolPanelModule,
  SetFilterModule,
} from "ag-grid-enterprise";

ModuleRegistry.registerModules([\
  ClientSideRowModelModule,\
  ColumnsToolPanelModule,\
  FiltersToolPanelModule,\
  ColumnMenuModule,\
  ContextMenuModule,\
  SetFilterModule,\
  NumberFilterModule,\
  ...(process.env.NODE_ENV !== "production" ? [ValidationModule] : []),\
]);
import { useFetchJson } from "./useFetchJson";

const GridExample = () => {
  const containerStyle = useMemo(() => ({ width: "100%", height: "100%" }), []);
  const gridStyle = useMemo(() => ({ height: "100%", width: "100%" }), []);

  const [columnDefs, setColumnDefs] = useState([\
    // set filters\
    { field: "athlete", filter: "agSetColumnFilter" },\
    {\
      field: "country",\
      filter: "agSetColumnFilter",\
      filterParams: {\
        defaultToNothingSelected: true,\
      },\
    },\
    // number filters\
    { field: "gold", filter: "agNumberColumnFilter" },\
    { field: "silver", filter: "agNumberColumnFilter" },\
    { field: "bronze", filter: "agNumberColumnFilter" },\
  ]);
  const defaultColDef = useMemo(() => {
    return {
      flex: 1,
      minWidth: 200,
      floatingFilter: true,
    };
  }, []);

  const { data, loading } = useFetchJson(
    "https://www.ag-grid.com/example-assets/olympic-winners.json",
  );

  return (
    <div style={containerStyle}>
      <div style={gridStyle}>
        <AgGridReact
          rowData={data}
          loading={loading}
          columnDefs={columnDefs}
          sideBar={"filters"}
          defaultColDef={defaultColDef}
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

## Filter Value Tooltips [Copy Link](https://www.ag-grid.com/react-data-grid/filter-set-filter-list/#filter-value-tooltips)

Set filter values that are too long to be displayed are truncated by default with ellipses. To allow users to see the full filter value, tooltips can be enabled as shown below:

```jsx
const [columnDefs, setColumnDefs] = useState([\
    {\
        field: 'country',\
        filter: 'agSetColumnFilter',\
        filterParams: {\
            showTooltips: true,\
        }\
    }\
]);

<AgGridReact columnDefs={columnDefs} />
```

The default tooltip component will be used unless a [Custom Tooltip Component](https://www.ag-grid.com/react-data-grid/tooltips/) is provided.

The following example demonstrates tooltips in the Set Filter. Note the following:

- Filter values are automatically truncated with ellipses when the values are too long.
- **Col A** does not have Set Filter Tooltips enabled.
- **Col B** has Set Filter Tooltips enabled via `filterParams.showTooltips=true`.
- **Col C** has Set Filter Tooltips enabled and is supplied a Custom Tooltip Component.

React Example - Filter Set Filter List - Filter Value Tooltips

Hide filesViewing: index.jsx

- styles.css
- customTooltip.jsx
- data.jsx
- index.jsx

Language:JavaScriptTypeScript

```jsx
"use client";

import React, { useMemo, useState, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AgGridReact } from "ag-grid-react";
import "./styles.css";
import {
  ClientSideRowModelModule,
  ModuleRegistry,
  TooltipModule,
  ValidationModule,
} from "ag-grid-community";
import {
  ColumnMenuModule,
  ColumnsToolPanelModule,
  ContextMenuModule,
  FiltersToolPanelModule,
  SetFilterModule,
} from "ag-grid-enterprise";
import { CustomTooltip } from "./customTooltip";
import { getData } from "./data";

ModuleRegistry.registerModules([\
  TooltipModule,\
  ClientSideRowModelModule,\
  ColumnsToolPanelModule,\
  FiltersToolPanelModule,\
  ColumnMenuModule,\
  ContextMenuModule,\
  SetFilterModule,\
  ...(process.env.NODE_ENV !== "production" ? [ValidationModule] : []),\
]);

const GridExample = () => {
  const containerStyle = useMemo(() => ({ width: "100%", height: "100%" }), []);
  const gridStyle = useMemo(() => ({ height: "100%", width: "100%" }), []);
  const [rowData, setRowData] = useState(getData());
  const [columnDefs, setColumnDefs] = useState([\
    {\
      field: "colA",\
      tooltipField: "colA",\
      filter: "agSetColumnFilter",\
    },\
    {\
      field: "colB",\
      tooltipField: "colB",\
      filter: "agSetColumnFilter",\
      filterParams: {\
        showTooltips: true,\
      },\
    },\
    {\
      field: "colC",\
      tooltipField: "colC",\
      tooltipComponent: CustomTooltip,\
      filter: "agSetColumnFilter",\
      filterParams: {\
        showTooltips: true,\
      },\
    },\
  ]);
  const defaultColDef = useMemo(() => {
    return {
      flex: 1,
    };
  }, []);

  return (
    <div style={containerStyle}>
      <div style={gridStyle}>
        <AgGridReact
          rowData={rowData}
          columnDefs={columnDefs}
          sideBar={"filters"}
          defaultColDef={defaultColDef}
          tooltipShowDelay={100}
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
