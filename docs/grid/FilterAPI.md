You can access and set the models for filters through the grid API, or access individual filter instances directly for more control. This page details how to do both.

The filter model can be saved and restored as part of [Grid State](https://www.ag-grid.com/react-data-grid/grid-state/).

## Get / Set All Filter Models [Copy Link](https://www.ag-grid.com/react-data-grid/filter-api/#get--set-all-filter-models)

It is possible to get the state of all filters using the grid API method `getFilterModel()`, and to set the state using `setFilterModel()`. These methods manage the filters states via the `getModel()` and `setModel()` methods of the individual filters.

|                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| getFilterModel [Copy Link](https://www.ag-grid.com/react-data-grid/filter-api/#reference-filter-getFilterModel)<br>Function<br>Gets the current state of all the column filters. Used for saving filter state.<br>[TextFilterModule](https://www.ag-grid.com/react-data-grid/modules/) +5<br>Available in any of [TextFilterModule](https://www.ag-grid.com/react-data-grid/modules/) [NumberFilterModule](https://www.ag-grid.com/react-data-grid/modules/) [DateFilterModule](https://www.ag-grid.com/react-data-grid/modules/) [SetFilterModule](https://www.ag-grid.com/react-data-grid/modules/) [MultiFilterModule](https://www.ag-grid.com/react-data-grid/modules/) [CustomFilterModule](https://www.ag-grid.com/react-data-grid/modules/)                                                                                                                                                                                                                                                                                                                                                              |
| setFilterModel [Copy Link](https://www.ag-grid.com/react-data-grid/filter-api/#reference-filter-setFilterModel)<br>Function<br>Sets the state of all the column filters. Provide it with what you get from `getFilterModel()` to restore filter state.<br>If inferring cell data types, and row data is initially empty or yet to be set,<br>the filter model will be applied asynchronously after row data is added.<br>To always perform this synchronously, set `cellDataType = false` on the default column definition,<br>or provide cell data types for every column.<br>[TextFilterModule](https://www.ag-grid.com/react-data-grid/modules/) +5<br>Available in any of [TextFilterModule](https://www.ag-grid.com/react-data-grid/modules/) [NumberFilterModule](https://www.ag-grid.com/react-data-grid/modules/) [DateFilterModule](https://www.ag-grid.com/react-data-grid/modules/) [SetFilterModule](https://www.ag-grid.com/react-data-grid/modules/) [MultiFilterModule](https://www.ag-grid.com/react-data-grid/modules/) [CustomFilterModule](https://www.ag-grid.com/react-data-grid/modules/) |

```jsx
// Gets filter model via the grid API
const model = gridApi.getFilterModel();

// Sets the filter model via the grid API
gridApi.setFilterModel(model);
```

The filter model represents the state of filters for all columns and has the following structure:

```js
// Sample filter model via getFilterModel()
{
    athlete: {
        filterType: 'text',
        type: 'startsWith',
        filter: 'mich'
    },
    age: {
        filterType: 'number',
        type: 'lessThan',
        filter: 30
    }
}

```

This is useful if you want to save the global filter state and apply it at a later stage. It is also useful for server-side filtering, where you want to pass the filter state to the server.

### Reset All Filters [Copy Link](https://www.ag-grid.com/react-data-grid/filter-api/#reset-all-filters)

You can reset all filters by doing the following:

```jsx
gridApi.setFilterModel(null);
```

### Example: Get / Set All Filter Models [Copy Link](https://www.ag-grid.com/react-data-grid/filter-api/#example-get--set-all-filter-models)

The example below shows getting and setting all the filter models in action.

- `Save Filter Model` saves the current filter state, which will then be displayed.
- `Restore Saved Filter Model` restores the saved filter state back into the grid.
- `Set Custom Filter Model` takes a custom hard-coded filter model and applies it to the grid.
- `Reset Filters` will clear all active filters.
- `Destroy Filter` destroys the filter for the **Athlete** column by calling `gridApi.destroyFilter('athlete')`. This removes any active filter from that column, and will cause the filter to be created with new initialisation values the next time it is interacted with.

(Note: the example uses the Enterprise-only [Set Filter](https://www.ag-grid.com/react-data-grid/filter-set/)).

Hide filesViewing: index.jsx

- styles.css
- index.jsx
- useFetchJson.jsx

Language:JavaScriptTypeScript

```jsx
"use client";

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
  DateFilterModule,
  ModuleRegistry,
  NumberFilterModule,
  TextFilterModule,
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
  TextFilterModule,\
  NumberFilterModule,\
  DateFilterModule,\
  ...(process.env.NODE_ENV !== "production" ? [ValidationModule] : []),\
]);
import { useFetchJson } from "./useFetchJson";

const filterParams = {
  comparator: (filterLocalDateAtMidnight, cellValue) => {
    const dateAsString = cellValue;
    if (dateAsString == null) return -1;
    const dateParts = dateAsString.split("/");
    const cellDate = new Date(
      Number(dateParts[2]),
      Number(dateParts[1]) - 1,
      Number(dateParts[0]),
    );
    if (filterLocalDateAtMidnight.getTime() === cellDate.getTime()) {
      return 0;
    }
    if (cellDate < filterLocalDateAtMidnight) {
      return -1;
    }
    if (cellDate > filterLocalDateAtMidnight) {
      return 1;
    }
    return 0;
  },
};

let savedFilterModel = null;

const GridExample = () => {
  const gridRef = useRef(null);
  const containerStyle = useMemo(() => ({ width: "100%", height: "100%" }), []);
  const gridStyle = useMemo(() => ({ height: "100%", width: "100%" }), []);

  const [columnDefs, setColumnDefs] = useState([\
    { field: "athlete", filter: "agTextColumnFilter" },\
    { field: "age", filter: "agNumberColumnFilter", maxWidth: 100 },\
    { field: "country" },\
    { field: "year", maxWidth: 100 },\
    {\
      field: "date",\
      filter: "agDateColumnFilter",\
      filterParams: filterParams,\
    },\
    { field: "sport" },\
    { field: "gold", filter: "agNumberColumnFilter" },\
    { field: "silver", filter: "agNumberColumnFilter" },\
    { field: "bronze", filter: "agNumberColumnFilter" },\
    { field: "total", filter: "agNumberColumnFilter" },\
  ]);
  const defaultColDef = useMemo(() => {
    return {
      flex: 1,
      minWidth: 150,
      filter: true,
    };
  }, []);

  const onGridReady = useCallback((params) => {
    params.api.getToolPanelInstance("filters").expandFilters();
  }, []);
  const { data, loading } = useFetchJson(
    "https://www.ag-grid.com/example-assets/olympic-winners.json",
  );

  const clearFilters = useCallback(() => {
    gridRef.current.api.setFilterModel(null);
  }, []);

  const saveFilterModel = useCallback(() => {
    savedFilterModel = gridRef.current.api.getFilterModel();
    const keys = Object.keys(savedFilterModel);
    const savedFilters = keys.length > 0 ? keys.join(", ") : "(none)";
    document.querySelector("#savedFilters").textContent = savedFilters;
  }, []);

  const restoreFilterModel = useCallback(() => {
    gridRef.current.api.setFilterModel(savedFilterModel);
  }, [savedFilterModel]);

  const restoreFromHardCoded = useCallback(() => {
    const hardcodedFilter = {
      country: {
        type: "set",
        values: ["Ireland", "United States"],
      },
      age: { type: "lessThan", filter: "30" },
      athlete: { type: "startsWith", filter: "Mich" },
      date: { type: "lessThan", dateFrom: "2010-01-01" },
    };
    gridRef.current.api.setFilterModel(hardcodedFilter);
  }, []);

  const destroyFilter = useCallback(() => {
    gridRef.current.api.destroyFilter("athlete");
  }, []);

  return (
    <div style={containerStyle}>
      <div className="example-wrapper">
        <div>
          <div className="button-group">
            <button onClick={saveFilterModel}>Save Filter Model</button>
            <button onClick={restoreFilterModel}>
              Restore Saved Filter Model
            </button>
            <button
              onClick={restoreFromHardCoded}
              title="Name = 'Mich%', Country = ['Ireland', 'United States'], Age < 30, Date < 01/01/2010"
            >
              Set Custom Filter Model
            </button>
            <button onClick={clearFilters}>Reset Filters</button>
            <button onClick={destroyFilter}>Destroy Filter</button>
          </div>
        </div>
        <div>
          <div className="button-group">
            Saved Filters: <span id="savedFilters">(none)</span>
          </div>
        </div>

        <div style={gridStyle}>
          <AgGridReact
            ref={gridRef}
            rowData={data}
            loading={loading}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            sideBar={"filters"}
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

## Get / Set Individual Filter Model [Copy Link](https://www.ag-grid.com/react-data-grid/filter-api/#get--set-individual-filter-model)

It is also possible to get or set the filter model for a specific filter, including your own custom filters.

|                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| getColumnFilterModel [Copy Link](https://www.ag-grid.com/react-data-grid/filter-api/#reference-filter-getColumnFilterModel)<br>Function<br>Gets the current filter model for the specified column.<br>Will return `null` if no active filter.<br>`useUnapplied`: If `enableFilterHandlers = true` and value is `true`, will return the unapplied filter model.<br>[TextFilterModule](https://www.ag-grid.com/react-data-grid/modules/) +5<br>Available in any of [TextFilterModule](https://www.ag-grid.com/react-data-grid/modules/) [NumberFilterModule](https://www.ag-grid.com/react-data-grid/modules/) [DateFilterModule](https://www.ag-grid.com/react-data-grid/modules/) [SetFilterModule](https://www.ag-grid.com/react-data-grid/modules/) [MultiFilterModule](https://www.ag-grid.com/react-data-grid/modules/) [CustomFilterModule](https://www.ag-grid.com/react-data-grid/modules/) |
| setColumnFilterModel [Copy Link](https://www.ag-grid.com/react-data-grid/filter-api/#reference-filter-setColumnFilterModel)<br>Function<br>Sets the filter model for the specified column.<br>Setting a `model` of `null` will reset the filter (make inactive).<br>Must wait on the response before calling `api.onFilterChanged()`.<br>[TextFilterModule](https://www.ag-grid.com/react-data-grid/modules/) +5<br>Available in any of [TextFilterModule](https://www.ag-grid.com/react-data-grid/modules/) [NumberFilterModule](https://www.ag-grid.com/react-data-grid/modules/) [DateFilterModule](https://www.ag-grid.com/react-data-grid/modules/) [SetFilterModule](https://www.ag-grid.com/react-data-grid/modules/) [MultiFilterModule](https://www.ag-grid.com/react-data-grid/modules/) [CustomFilterModule](https://www.ag-grid.com/react-data-grid/modules/)                          |

### Re-running Grid Filtering [Copy Link](https://www.ag-grid.com/react-data-grid/filter-api/#re-running-grid-filtering)

After filters have been changed via their API, you must ensure the method `gridApi.onFilterChanged()` is called to tell the grid to filter the rows again. If `gridApi.onFilterChanged()` is not called, the grid will still show the data relevant to the filters before they were updated through the API.

```js
// Set a filter model
await api.setColumnFilterModel('name', {
  filterType: 'text',
  type: 'startsWith',
  filter: 'abc',
});

// Tell grid to run filter operation again
api.onFilterChanged();
```

### Reset Individual Filters [Copy Link](https://www.ag-grid.com/react-data-grid/filter-api/#reset-individual-filters)

You can reset a filter to its original state by setting the model to `null`.

```js
// Set the model to null
await api.setColumnFilterModel('name', null);

// Tell grid to run filter operation again
api.onFilterChanged();
```

### Example: Get / Set Individual Filter Model [Copy Link](https://www.ag-grid.com/react-data-grid/filter-api/#example-get--set-individual-filter-model)

The example below shows getting and setting an individual filter model in action.

- `Save Filter Model` saves the **Athlete** filter state, which will then be displayed.
- `Restore Saved Filter Model` restores the saved **Athlete** filter state back into the grid.
- `Set Custom Filter Model` takes a custom hard-coded **Athlete** filter model and applies it to the grid.
- `Reset Filter` will clear the **Athlete** filter.

Hide filesViewing: index.jsx

- styles.css
- index.jsx
- useFetchJson.jsx

Language:JavaScriptTypeScript

```jsx
"use client";

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
  NumberFilterModule,
  TextFilterModule,
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
  TextFilterModule,\
  NumberFilterModule,\
  ...(process.env.NODE_ENV !== "production" ? [ValidationModule] : []),\
]);
import { useFetchJson } from "./useFetchJson";

const filterParams = {
  comparator: (filterLocalDateAtMidnight, cellValue) => {
    const dateAsString = cellValue;
    if (dateAsString == null) return -1;
    const dateParts = dateAsString.split("/");
    const cellDate = new Date(
      Number(dateParts[2]),
      Number(dateParts[1]) - 1,
      Number(dateParts[0]),
    );
    if (filterLocalDateAtMidnight.getTime() === cellDate.getTime()) {
      return 0;
    }
    if (cellDate < filterLocalDateAtMidnight) {
      return -1;
    }
    if (cellDate > filterLocalDateAtMidnight) {
      return 1;
    }
    return 0;
  },
};

let savedFilterModel = null;

const GridExample = () => {
  const gridRef = useRef(null);
  const containerStyle = useMemo(() => ({ width: "100%", height: "100%" }), []);
  const gridStyle = useMemo(() => ({ height: "100%", width: "100%" }), []);

  const [columnDefs, setColumnDefs] = useState([\
    { field: "athlete", filter: "agTextColumnFilter" },\
    { field: "age", filter: "agNumberColumnFilter", maxWidth: 100 },\
    { field: "country", filter: "agTextColumnFilter" },\
    { field: "year", filter: "agNumberColumnFilter", maxWidth: 100 },\
    { field: "sport", filter: "agTextColumnFilter" },\
    { field: "gold", filter: "agNumberColumnFilter" },\
    { field: "silver", filter: "agNumberColumnFilter" },\
    { field: "bronze", filter: "agNumberColumnFilter" },\
    { field: "total", filter: "agNumberColumnFilter" },\
  ]);
  const defaultColDef = useMemo(() => {
    return {
      flex: 1,
      minWidth: 150,
      filter: true,
    };
  }, []);

  const onGridReady = useCallback((params) => {
    params.api.getToolPanelInstance("filters").expandFilters(["athlete"]);
  }, []);
  const { data, loading } = useFetchJson(
    "https://www.ag-grid.com/example-assets/olympic-winners.json",
  );

  const clearFilter = useCallback(() => {
    gridRef.current.api.setColumnFilterModel("athlete", null).then(() => {
      gridRef.current.api.onFilterChanged();
    });
  }, []);

  const saveFilterModel = useCallback(() => {
    savedFilterModel = gridRef.current.api.getColumnFilterModel("athlete");
    const convertTextFilterModel = (model) => {
      return `${model.type} ${model.filter}`;
    };
    const convertCombinedFilterModel = (model) => {
      return model.conditions
        .map((condition) => convertTextFilterModel(condition))
        .join(` ${model.operator} `);
    };
    let savedFilterString;
    if (!savedFilterModel) {
      savedFilterString = "(none)";
    } else if (savedFilterModel.operator) {
      savedFilterString = convertCombinedFilterModel(savedFilterModel);
    } else {
      savedFilterString = convertTextFilterModel(savedFilterModel);
    }
    document.querySelector("#savedFilters").innerText = savedFilterString;
  }, [savedFilterModel]);

  const restoreFilterModel = useCallback(() => {
    gridRef.current.api
      .setColumnFilterModel("athlete", savedFilterModel)
      .then(() => {
        gridRef.current.api.onFilterChanged();
      });
  }, []);

  const restoreFromHardCoded = useCallback(() => {
    const hardcodedFilter = { type: "startsWith", filter: "Mich" };
    gridRef.current.api
      .setColumnFilterModel("athlete", hardcodedFilter)
      .then(() => {
        gridRef.current.api.onFilterChanged();
      });
  }, []);

  return (
    <div style={containerStyle}>
      <div className="example-wrapper">
        <div>
          <div className="button-group">
            <button onClick={saveFilterModel}>Save Filter Model</button>
            <button onClick={restoreFilterModel}>
              Restore Saved Filter Model
            </button>
            <button
              onClick={restoreFromHardCoded}
              title="Name = 'Mich%', Country = ['Ireland', 'United States'], Age < 30, Date < 01/01/2010"
            >
              Set Custom Filter Model
            </button>
            <button onClick={clearFilter}>Reset Filter</button>
          </div>
        </div>
        <div>
          <div className="button-group">
            Saved Filters: <span id="savedFilters">(none)</span>
          </div>
        </div>

        <div style={gridStyle}>
          <AgGridReact
            ref={gridRef}
            rowData={data}
            loading={loading}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            sideBar={"filters"}
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

## Accessing Individual Filters [Copy Link](https://www.ag-grid.com/react-data-grid/filter-api/#accessing-individual-filters)

It certain cases, it may be needed to interact directly with a specific filter. For instance, [Refreshing Values](https://www.ag-grid.com/react-data-grid/filter-set-filter-list/#refreshing-values) on the Set Filter.

Grid-provided filters are split into two parts - the filter UI component and the filter handler (which performs the filter logic).

When `enableFilterHandlers = true`, [Custom Filter Components](https://www.ag-grid.com/react-data-grid/component-filter/) are also split into two parts.

Note that the [Multi Filter](https://www.ag-grid.com/react-data-grid/filter-multi/) will only have a filter handler when `enableFilterHandlers = true`.

To access the filter UI component, use `api.getColumnFilterInstance(colKey)`.

To access the filter hander, use `api.getColumnFilterHandler(colKey)`.

|                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| getColumnFilterInstance [Copy Link](https://www.ag-grid.com/react-data-grid/filter-api/#reference-filter-getColumnFilterInstance)<br>Function<br>Returns the filter component instance for a column.<br>For getting/setting models for individual column filters, use `getColumnFilterModel` and `setColumnFilterModel` instead of this.<br>`key` can be a column ID or a `Column` object.<br>[TextFilterModule](https://www.ag-grid.com/react-data-grid/modules/) +5<br>Available in any of [TextFilterModule](https://www.ag-grid.com/react-data-grid/modules/) [NumberFilterModule](https://www.ag-grid.com/react-data-grid/modules/) [DateFilterModule](https://www.ag-grid.com/react-data-grid/modules/) [SetFilterModule](https://www.ag-grid.com/react-data-grid/modules/) [MultiFilterModule](https://www.ag-grid.com/react-data-grid/modules/) [CustomFilterModule](https://www.ag-grid.com/react-data-grid/modules/)                                                         |
| getColumnFilterHandler [Copy Link](https://www.ag-grid.com/react-data-grid/filter-api/#reference-filter-getColumnFilterHandler)<br>Function<br>Returns the filter handler instance for a column.<br>Used when `enableFilterHandlers = true`, or when using a grid-provided filter.<br>If using a `SimpleColumnFilter`, this will be an object containing the provided `doesFilterPass` callback.<br>`key` can be a column ID or a `Column` object.<br>[TextFilterModule](https://www.ag-grid.com/react-data-grid/modules/) +5<br>Available in any of [TextFilterModule](https://www.ag-grid.com/react-data-grid/modules/) [NumberFilterModule](https://www.ag-grid.com/react-data-grid/modules/) [DateFilterModule](https://www.ag-grid.com/react-data-grid/modules/) [SetFilterModule](https://www.ag-grid.com/react-data-grid/modules/) [MultiFilterModule](https://www.ag-grid.com/react-data-grid/modules/) [CustomFilterModule](https://www.ag-grid.com/react-data-grid/modules/) |

```js
// Get a reference to the 'name' filter UI instance
const filterInstance = await api.getColumnFilterInstance('name');
```

If using a custom filter, any other methods you have added will also be present, allowing bespoke behaviour to be added to your filter.

### Example: Accessing Individual Filters [Copy Link](https://www.ag-grid.com/react-data-grid/filter-api/#example-accessing-individual-filters)

The example below shows how you can interact with an individual filter instance, using the Set Filter as an example.

- `Get Mini Filter Text` will print the text from the Set Filter's Mini Filter to the console.
- `Save Mini Filter Text` will save the Mini Filter text.
- `Restore Mini Filter Text` will restore the Mini Filter text from the saved state.

(Note: the example uses the Enterprise-only [Set Filter](https://www.ag-grid.com/react-data-grid/filter-set/)).

Hide filesViewing: index.jsx

- styles.css
- index.jsx
- useFetchJson.jsx

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
import { useFetchJson } from "./useFetchJson";

let savedMiniFilterText = "";

const GridExample = () => {
  const gridRef = useRef(null);
  const containerStyle = useMemo(() => ({ width: "100%", height: "100%" }), []);
  const gridStyle = useMemo(() => ({ height: "100%", width: "100%" }), []);

  const [columnDefs, setColumnDefs] = useState([\
    { field: "athlete", filter: "agSetColumnFilter" },\
  ]);
  const defaultColDef = useMemo(() => {
    return {
      flex: 1,
      minWidth: 150,
      filter: true,
    };
  }, []);

  const onGridReady = useCallback((params) => {
    params.api.getToolPanelInstance("filters").expandFilters();
  }, []);
  const { data, loading } = useFetchJson(
    "https://www.ag-grid.com/example-assets/olympic-winners.json",
  );

  const getMiniFilterText = useCallback(() => {
    gridRef.current.api
      .getColumnFilterInstance("athlete")
      .then((athleteFilter) => {
        console.log(athleteFilter.getMiniFilter());
      });
  }, []);

  const saveMiniFilterText = useCallback(() => {
    gridRef.current.api
      .getColumnFilterInstance("athlete")
      .then((athleteFilter) => {
        savedMiniFilterText = athleteFilter.getMiniFilter();
      });
  }, []);

  const restoreMiniFilterText = useCallback(() => {
    gridRef.current.api
      .getColumnFilterInstance("athlete")
      .then((athleteFilter) => {
        athleteFilter.setMiniFilter(savedMiniFilterText);
      });
  }, [savedMiniFilterText]);

  return (
    <div style={containerStyle}>
      <div className="example-wrapper">
        <div className="example-header">
          <button onClick={getMiniFilterText}>Get Mini Filter Text</button>
          <button onClick={saveMiniFilterText}>Save Mini Filter Text</button>
          <button onClick={restoreMiniFilterText}>
            Restore Mini Filter Text
          </button>
        </div>

        <div style={gridStyle}>
          <AgGridReact
            ref={gridRef}
            rowData={data}
            loading={loading}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            sideBar={"filters"}
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

## Read-only Filter UI [Copy Link](https://www.ag-grid.com/react-data-grid/filter-api/#read-only-filter-ui)

Sometimes it maybe useful to strictly control the filters used by the grid via API, whilst still exposing filter settings in-use to users. The `readOnly` filter parameter changes the behaviour of all provided column filters so their UI is read-only. In this mode, API filter changes are still honoured and reflected in the UI:

```jsx
const [columnDefs, setColumnDefs] = useState([\
    {\
        field: 'age',\
        filter: true,\
        filterParams: {\
            readOnly: true\
        }\
    }\
]);

<AgGridReact columnDefs={columnDefs} />
```

The following example demonstrates all of the Provided Filters with `readOnly: true` enabled:

- Simple Filters have a read-only display with no buttons; if there is no 2nd condition set then the join operator and 2nd condition are hidden:
  - `athlete` column demonstrates [Text Filter](https://www.ag-grid.com/react-data-grid/filter-text/).
  - `age` and `year` columns demonstrate [Number Filter](https://www.ag-grid.com/react-data-grid/filter-number/).
  - `date` column demonstrates [Date Filter](https://www.ag-grid.com/react-data-grid/filter-date/).
- [Set Filter](https://www.ag-grid.com/react-data-grid/filter-set/) allows Mini Filter searching of values, but value inclusion/exclusion cannot be toggled; buttons are also hidden, and pressing enter in the Mini Filter input has no effect:
  - `country`, `gold`, `silver` and `bronze` columns demonstrate [Set Filter](https://www.ag-grid.com/react-data-grid/filter-set/).
- [Multi Filter](https://www.ag-grid.com/react-data-grid/filter-multi/) has no direct behaviour change, sub-filters need to be individually made read-only. `readOnly: true` is needed to affect any associated [Floating Filters](https://www.ag-grid.com/react-data-grid/floating-filters/).
  - `sport` column demonstrates [Multi Filter](https://www.ag-grid.com/react-data-grid/filter-multi/).
- [Floating Filters](https://www.ag-grid.com/react-data-grid/floating-filters/) are enabled and inherit `readOnly: true` from their parent, disabling any UI input.
- Buttons above the grid provide API interactions to configure the filters.
- `Print Country` button prints the country model to the developer console.

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
  DateFilterModule,
  ModuleRegistry,
  NumberFilterModule,
  TextFilterModule,
  ValidationModule,
} from "ag-grid-community";
import {
  ColumnMenuModule,
  ColumnsToolPanelModule,
  ContextMenuModule,
  MultiFilterModule,
  SetFilterModule,
} from "ag-grid-enterprise";

ModuleRegistry.registerModules([\
  ClientSideRowModelModule,\
  ColumnsToolPanelModule,\
  ColumnMenuModule,\
  ContextMenuModule,\
  MultiFilterModule,\
  SetFilterModule,\
  TextFilterModule,\
  NumberFilterModule,\
  DateFilterModule,\
  ...(process.env.NODE_ENV !== "production" ? [ValidationModule] : []),\
]);

const defaultFilterParams = { readOnly: true };

const GridExample = () => {
  const gridRef = useRef(null);
  const containerStyle = useMemo(() => ({ width: "100%", height: "100%" }), []);
  const gridStyle = useMemo(() => ({ height: "100%", width: "100%" }), []);
  const [rowData, setRowData] = useState();
  const [columnDefs, setColumnDefs] = useState([\
    {\
      field: "athlete",\
    },\
    {\
      field: "age",\
    },\
    {\
      field: "country",\
      filter: "agSetColumnFilter",\
    },\
    {\
      field: "year",\
      maxWidth: 120,\
    },\
    {\
      field: "date",\
      minWidth: 215,\
      suppressHeaderMenuButton: true,\
    },\
    {\
      field: "sport",\
      suppressHeaderMenuButton: true,\
      filter: "agMultiColumnFilter",\
      filterParams: {\
        filters: [\
          { filter: "agTextColumnFilter", filterParams: { readOnly: true } },\
          { filter: "agSetColumnFilter", filterParams: { readOnly: true } },\
        ],\
        readOnly: true,\
      },\
    },\
    {\
      field: "gold",\
      filter: "agSetColumnFilter",\
    },\
    {\
      field: "silver",\
      filter: "agSetColumnFilter",\
    },\
    {\
      field: "bronze",\
      filter: "agSetColumnFilter",\
    },\
    { field: "total", filter: false },\
  ]);
  const defaultColDef = useMemo(() => {
    return {
      flex: 1,
      minWidth: 150,
      filter: true,
      floatingFilter: true,
      filterParams: defaultFilterParams,
    };
  }, []);

  const onGridReady = useCallback((params) => {
    fetch("https://www.ag-grid.com/example-assets/olympic-winners.json")
      .then((resp) => resp.json())
      .then((data) =>
        setRowData(
          data.map((rowData) => {
            const dateParts = rowData.date.split("/");
            return {
              ...rowData,
              date: `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`,
            };
          }),
        ),
      );
  }, []);

  const irelandAndUk = useCallback(() => {
    gridRef.current.api
      .setColumnFilterModel("country", { values: ["Ireland", "Great Britain"] })
      .then(() => {
        gridRef.current.api.onFilterChanged();
      });
  }, []);

  const clearCountryFilter = useCallback(() => {
    gridRef.current.api.setColumnFilterModel("country", null).then(() => {
      gridRef.current.api.onFilterChanged();
    });
  }, []);

  const destroyCountryFilter = useCallback(() => {
    gridRef.current.api.destroyFilter("country");
  }, []);

  const endingStan = useCallback(() => {
    const countriesEndingWithStan = gridRef.current.api
      .getColumnFilterHandler("country")
      .getFilterKeys()
      .filter(function (value) {
        return value.indexOf("stan") === value.length - 4;
      });
    gridRef.current.api
      .setColumnFilterModel("country", { values: countriesEndingWithStan })
      .then(() => {
        gridRef.current.api.onFilterChanged();
      });
  }, []);

  const printCountryModel = useCallback(() => {
    const model = gridRef.current.api.getColumnFilterModel("country");
    if (model) {
      console.log("Country model is: " + JSON.stringify(model));
    } else {
      console.log("Country model filter is not active");
    }
  }, []);

  const sportStartsWithS = useCallback(() => {
    gridRef.current.api
      .setColumnFilterModel("sport", {
        filterModels: [\
          {\
            type: "startsWith",\
            filter: "s",\
          },\
        ],
      })
      .then(() => {
        gridRef.current.api.onFilterChanged();
      });
  }, []);

  const sportEndsWithG = useCallback(() => {
    gridRef.current.api
      .setColumnFilterModel("sport", {
        filterModels: [\
          {\
            type: "endsWith",\
            filter: "g",\
          },\
        ],
      })
      .then(() => {
        gridRef.current.api.onFilterChanged();
      });
  }, []);

  const sportsCombined = useCallback(() => {
    gridRef.current.api
      .setColumnFilterModel("sport", {
        filterModels: [\
          {\
            conditions: [\
              {\
                type: "endsWith",\
                filter: "g",\
              },\
              {\
                type: "startsWith",\
                filter: "s",\
              },\
            ],\
            operator: "AND",\
          },\
        ],
      })
      .then(() => {
        gridRef.current.api.onFilterChanged();
      });
  }, []);

  const ageBelow25 = useCallback(() => {
    gridRef.current.api
      .setColumnFilterModel("age", {
        type: "lessThan",
        filter: 25,
        filterTo: null,
      })
      .then(() => {
        gridRef.current.api.onFilterChanged();
      });
  }, []);

  const ageAbove30 = useCallback(() => {
    gridRef.current.api
      .setColumnFilterModel("age", {
        type: "greaterThan",
        filter: 30,
        filterTo: null,
      })
      .then(() => {
        gridRef.current.api.onFilterChanged();
      });
  }, []);

  const ageBelow25OrAbove30 = useCallback(() => {
    gridRef.current.api
      .setColumnFilterModel("age", {
        conditions: [\
          {\
            type: "greaterThan",\
            filter: 30,\
            filterTo: null,\
          },\
          {\
            type: "lessThan",\
            filter: 25,\
            filterTo: null,\
          },\
        ],
        operator: "OR",
      })
      .then(() => {
        gridRef.current.api.onFilterChanged();
      });
  }, []);

  const ageBetween25And30 = useCallback(() => {
    gridRef.current.api
      .setColumnFilterModel("age", {
        type: "inRange",
        filter: 25,
        filterTo: 30,
      })
      .then(() => {
        gridRef.current.api.onFilterChanged();
      });
  }, []);

  const clearAgeFilter = useCallback(() => {
    gridRef.current.api.setColumnFilterModel("age", null).then(() => {
      gridRef.current.api.onFilterChanged();
    });
  }, []);

  const after2010 = useCallback(() => {
    gridRef.current.api
      .setColumnFilterModel("date", {
        type: "greaterThan",
        dateFrom: "2010-01-01",
        dateTo: null,
      })
      .then(() => {
        gridRef.current.api.onFilterChanged();
      });
  }, []);

  const before2012 = useCallback(() => {
    gridRef.current.api
      .setColumnFilterModel("date", {
        type: "lessThan",
        dateFrom: "2012-01-01",
        dateTo: null,
      })
      .then(() => {
        gridRef.current.api.onFilterChanged();
      });
  }, []);

  const dateCombined = useCallback(() => {
    gridRef.current.api
      .setColumnFilterModel("date", {
        conditions: [\
          {\
            type: "lessThan",\
            dateFrom: "2012-01-01",\
            dateTo: null,\
          },\
          {\
            type: "greaterThan",\
            dateFrom: "2010-01-01",\
            dateTo: null,\
          },\
        ],
        operator: "OR",
      })
      .then(() => {
        gridRef.current.api.onFilterChanged();
      });
  }, []);

  const clearDateFilter = useCallback(() => {
    gridRef.current.api.setColumnFilterModel("date", null).then(() => {
      gridRef.current.api.onFilterChanged();
    });
  }, []);

  const clearSportFilter = useCallback(() => {
    gridRef.current.api.setColumnFilterModel("sport", null).then(() => {
      gridRef.current.api.onFilterChanged();
    });
  }, []);

  return (
    <div style={containerStyle}>
      <div className="example-wrapper">
        <div className="example-header">
          <span className="button-group">
            <button onClick={irelandAndUk}>Ireland &amp; UK</button>
            <button onClick={endingStan}>Countries Ending 'stan'</button>
            <button onClick={printCountryModel}>Print Country</button>
            <button onClick={clearCountryFilter}>Clear Country</button>
            <button onClick={destroyCountryFilter}>Destroy Country</button>
          </span>
          <span className="button-group">
            <button onClick={ageBelow25}>Age Below 25</button>
            <button onClick={ageAbove30}>Age Above 30</button>
            <button onClick={ageBelow25OrAbove30}>
              Age Below 25 or Above 30
            </button>
            <button onClick={ageBetween25And30}>Age Between 25 and 30</button>
            <button onClick={clearAgeFilter}>Clear Age Filter</button>
          </span>
          <span className="button-group">
            <button onClick={after2010}>Date after 01/01/2010</button>
            <button onClick={before2012}>Date before 01/01/2012</button>
            <button onClick={dateCombined}>Date combined</button>
            <button onClick={clearDateFilter}>Clear Date Filter</button>
          </span>
          <span className="button-group">
            <button onClick={sportStartsWithS}>Sport starts with S</button>
            <button onClick={sportEndsWithG}>Sport ends with G</button>
            <button onClick={sportsCombined}>
              Sport starts with S and ends with G
            </button>
            <button onClick={clearSportFilter}>Clear Sport Filter</button>
          </span>
        </div>

        <div style={gridStyle}>
          <AgGridReact
            ref={gridRef}
            rowData={rowData}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            suppressSetFilterByDefault={true}
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

## Launching Filters [Copy Link](https://www.ag-grid.com/react-data-grid/filter-api/#launching-filters)

How filters are launched can be customised (unless grid option `columnMenu = 'legacy'`).

`colDef.suppressHeaderFilterButton = true` can be used to disable the button in the header that opens the filter.

The filter can also be launched via `api.showColumnFilter(columnKey)` and hidden via `api.hideColumnFilter()`.

The following example demonstrates launching the filter:

- The **Athlete** column has a filter button in the header to launch the filter.
- The **Age** column has a floating filter, so the header button is automatically hidden.
- The **Country** column has the filter button hidden via `colDef.suppressHeaderFilterButton`. The filter can still be opened via the API by clicking the `Open Country Filter` button.
- The **Year** column has a floating filter and the header button is also suppressed, so has a slightly different display style when the filter is active.

Hide filesViewing: index.jsx

- styles.css
- index.jsx
- useFetchJson.jsx

Language:JavaScriptTypeScript

```jsx
"use client";

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
  NumberFilterModule,
  TextFilterModule,
  ValidationModule,
} from "ag-grid-community";

ModuleRegistry.registerModules([\
  TextFilterModule,\
  NumberFilterModule,\
  ClientSideRowModelModule,\
  ...(process.env.NODE_ENV !== "production" ? [ValidationModule] : []),\
]);
import { useFetchJson } from "./useFetchJson";

const GridExample = () => {
  const gridRef = useRef(null);
  const containerStyle = useMemo(() => ({ width: "100%", height: "100%" }), []);
  const gridStyle = useMemo(() => ({ height: "100%", width: "100%" }), []);

  const [columnDefs, setColumnDefs] = useState([\
    { field: "athlete" },\
    { field: "age", floatingFilter: true },\
    { field: "country", suppressHeaderFilterButton: true },\
    {\
      field: "year",\
      maxWidth: 120,\
      floatingFilter: true,\
      suppressHeaderFilterButton: true,\
    },\
    { field: "sport" },\
    { field: "gold" },\
    { field: "silver" },\
    { field: "bronze" },\
    { field: "total", filter: false },\
  ]);
  const defaultColDef = useMemo(() => {
    return {
      flex: 1,
      minWidth: 150,
      filter: true,
    };
  }, []);

  const { data, loading } = useFetchJson(
    "https://www.ag-grid.com/example-assets/olympic-winners.json",
  );

  const openCountryFilter = useCallback(() => {
    gridRef.current.api.showColumnFilter("country");
  }, []);

  return (
    <div style={containerStyle}>
      <div className="example-wrapper">
        <div>
          <div className="button-group">
            <button onClick={openCountryFilter}>Open Country Filter</button>
          </div>
        </div>

        <div style={gridStyle}>
          <AgGridReact
            ref={gridRef}
            rowData={data}
            loading={loading}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
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

## Filter Events [Copy Link](https://www.ag-grid.com/react-data-grid/filter-api/#filter-events)

Filtering causes the following events to be emitted:

|                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| filterOpened [Copy Link](https://www.ag-grid.com/react-data-grid/filter-api/#reference-filter-filterOpened)<br>FilterOpenedEvent<br>Filter has been opened.                                                                                                        |
| filterChanged [Copy Link](https://www.ag-grid.com/react-data-grid/filter-api/#reference-filter-filterChanged)<br>FilterChangedEvent<br>Filter has been modified and applied.                                                                                       |
| filterModified [Copy Link](https://www.ag-grid.com/react-data-grid/filter-api/#reference-filter-filterModified)<br>FilterModifiedEvent<br>Filter was modified but not applied (when using `enableFilterHandlers = false`). Used when filters have 'Apply' buttons. |
| filterUiChanged [Copy Link](https://www.ag-grid.com/react-data-grid/filter-api/#reference-filter-filterUiChanged)<br>FilterUiChangedEvent<br>Filter UI was modified (when using `enableFilterHandlers = true`).                                                    |
| floatingFilterUiChanged [Copy Link](https://www.ag-grid.com/react-data-grid/filter-api/#reference-filter-floatingFilterUiChanged)<br>FloatingFilterUiChangedEvent<br>Floating filter UI modified (when using `enableFilterHandlers = true`).                       |
