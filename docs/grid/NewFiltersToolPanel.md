The new **Filters Tool Panel** allows accessing the grid's filters without needing to open up the column menu.

## Enabling New Filters Tool Panel [Copy Link](https://www.ag-grid.com/react-data-grid/tool-panel-filters-new/#enabling-new-filters-tool-panel)

React Example - Tool Panel Filters New - Simple

Athlete

Age

Loading...

Filters

Add Filter

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
  DateFilterModule,
  ModuleRegistry,
  NumberFilterModule,
  TextFilterModule,
  ValidationModule,
} from "ag-grid-community";
import {
  ColumnMenuModule,
  ContextMenuModule,
  NewFiltersToolPanelModule,
  SetFilterModule,
} from "ag-grid-enterprise";

ModuleRegistry.registerModules([\
  NumberFilterModule,\
  DateFilterModule,\
  ClientSideRowModelModule,\
  NewFiltersToolPanelModule,\
  ColumnMenuModule,\
  ContextMenuModule,\
  SetFilterModule,\
  TextFilterModule,\
  ...(process.env.NODE_ENV !== "production" ? [ValidationModule] : []),\
]);

const GridExample = () => {
  const containerStyle = useMemo(() => ({ width: "100%", height: "100%" }), []);
  const gridStyle = useMemo(() => ({ height: "100%", width: "100%" }), []);
  const [rowData, setRowData] = useState();
  const [columnDefs, setColumnDefs] = useState([\
    { field: "athlete" },\
    { field: "age" },\
    { field: "country" },\
    { field: "date", minWidth: 180 },\
    { field: "total" },\
  ]);
  const defaultColDef = useMemo(() => {
    return {
      flex: 1,
      minWidth: 100,
      filter: "agSelectableColumnFilter",
      floatingFilter: true,
    };
  }, []);

  const onGridReady = useCallback((params) => {
    fetch("https://www.ag-grid.com/example-assets/olympic-winners.json")
      .then((resp) => resp.json())
      .then((data) =>
        setRowData(
          data.map((rowData) => {
            const dateParts = rowData.date.split("/");
            const [year, month, day] = dateParts
              .reverse()
              .map((e) => parseInt(e, 10));
            const paddedDateTimeStrings = [month, day].map((e) =>
              e.toString().padStart(2, "0"),
            );
            const date = `${year}-${paddedDateTimeStrings[0]}-${paddedDateTimeStrings[1]}`;
            return {
              ...rowData,
              date,
            };
          }),
        ),
      );
  }, []);

  return (
    <div style={containerStyle}>
      <div style={gridStyle}>
        <AgGridReact
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          sideBar={"filters-new"}
          enableFilterHandlers={true}
          suppressSetFilterByDefault={true}
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

To use the new Filters Tool Panel, set `enableFilterHandlers = true`, and use the `'filters-new'` [Side Bar Configuration](https://www.ag-grid.com/react-data-grid/side-bar/#configuring-the-side-bar).

If a filter is set from anywhere outside of the tool panel, e.g. from the column menu, the filter will automatically be added to the tool panel. Once a filter appears in the tool panel, it will remain until it's removed from within the tool panel.

## Using Buttons [Copy Link](https://www.ag-grid.com/react-data-grid/tool-panel-filters-new/#using-buttons)

The tool panel can be configured to have global [Apply, Clear, Reset and Cancel Buttons](https://www.ag-grid.com/react-data-grid/filter-applying/#apply-clear-reset-and-cancel-buttons). These behave the same as when used within an individual filter, but instead apply to all filters at once.

To use global buttons, every filter must first be configured to use the buttons. The global buttons can then be passed to the tool panel configuration when using `agNewFiltersToolPanel`, by passing an `IToolPanelNewFiltersCompParams` object:

|                                                                                                                                                                                                                            |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| buttons [Copy Link](https://www.ag-grid.com/react-data-grid/tool-panel-filters-new/#reference-IToolPanelNewFiltersCompParams-buttons)<br>FilterAction\[\]<br>Allows global buttons to be provided to the filter tool panel |

The example below demonstrates using buttons with the tool panel:

React Example - Tool Panel Filters New - Using Buttons

Athlete

Age

Loading...

Filters

Add Filter

CancelApply

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
  DateFilterModule,
  ModuleRegistry,
  NumberFilterModule,
  TextFilterModule,
  ValidationModule,
} from "ag-grid-community";
import {
  ColumnMenuModule,
  ContextMenuModule,
  NewFiltersToolPanelModule,
  SetFilterModule,
} from "ag-grid-enterprise";

ModuleRegistry.registerModules([\
  NumberFilterModule,\
  DateFilterModule,\
  ClientSideRowModelModule,\
  NewFiltersToolPanelModule,\
  ColumnMenuModule,\
  ContextMenuModule,\
  SetFilterModule,\
  TextFilterModule,\
  ...(process.env.NODE_ENV !== "production" ? [ValidationModule] : []),\
]);

const GridExample = () => {
  const containerStyle = useMemo(() => ({ width: "100%", height: "100%" }), []);
  const gridStyle = useMemo(() => ({ height: "100%", width: "100%" }), []);
  const [rowData, setRowData] = useState();
  const [columnDefs, setColumnDefs] = useState([\
    { field: "athlete" },\
    { field: "age" },\
    { field: "country" },\
    { field: "date", minWidth: 180 },\
    { field: "total" },\
  ]);
  const defaultColDef = useMemo(() => {
    return {
      flex: 1,
      minWidth: 100,
      filter: "agSelectableColumnFilter",
      filterParams: {
        defaultFilterParams: {
          buttons: ["apply"], // set all filters to use buttons
        },
      },
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
            buttons: ["cancel", "apply"],\
          },\
        },\
      ],
      defaultToolPanel: "filters-new",
    };
  }, []);

  const onGridReady = useCallback((params) => {
    fetch("https://www.ag-grid.com/example-assets/olympic-winners.json")
      .then((resp) => resp.json())
      .then((data) =>
        setRowData(
          data.map((rowData) => {
            const dateParts = rowData.date.split("/");
            const [year, month, day] = dateParts
              .reverse()
              .map((e) => parseInt(e, 10));
            const paddedDateTimeStrings = [month, day].map((e) =>
              e.toString().padStart(2, "0"),
            );
            const date = `${year}-${paddedDateTimeStrings[0]}-${paddedDateTimeStrings[1]}`;
            return {
              ...rowData,
              date,
            };
          }),
        ),
      );
  }, []);

  return (
    <div style={containerStyle}>
      <div style={gridStyle}>
        <AgGridReact
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          sideBar={sideBar}
          enableFilterHandlers={true}
          suppressSetFilterByDefault={true}
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

Note that when opened from the column menu, the buttons will be visible within the individual filters. Within the tool panel, only the global buttons will be visible.

## Configuring Filters [Copy Link](https://www.ag-grid.com/react-data-grid/tool-panel-filters-new/#configuring-filters)

### Changing Selectable Filters [Copy Link](https://www.ag-grid.com/react-data-grid/tool-panel-filters-new/#changing-selectable-filters)

For each column filter, the filter type can be changed by using the dropdown within the tool panel. To enable switching filters, set `filter: 'agSelectableColumnFilter'` on the column definition. For any other `filter` value, the dropdown will not be displayed.

By default, the dropdown will allow switching between:

- `Simple Filter` \- [Text Filter](https://www.ag-grid.com/react-data-grid/filter-text/), [Number Filter](https://www.ag-grid.com/react-data-grid/filter-number/) or [Date Filter](https://www.ag-grid.com/react-data-grid/filter-date/), depending on the [Cell Data Type](https://www.ag-grid.com/react-data-grid/cell-data-types/)
- `Selection Filter` \- [Set Filter](https://www.ag-grid.com/react-data-grid/filter-set/)
- `Combo Filter` \- [Multi Filter](https://www.ag-grid.com/react-data-grid/filter-multi/) (if the `MultiFilterModule` is loaded)

To allow other filters to be configured in the dropdown, `filterParams` of type `SelectableFilterParams` can be set on the column definition:

|                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| filters [Copy Link](https://www.ag-grid.com/react-data-grid/tool-panel-filters-new/#reference-SelectableFilterParams-filters)<br>SelectableFilterDef\[\]<br>List of possible filters which will show in the filter card. If not provided, will default to grid-provided filters |
| defaultFilterIndex [Copy Link](https://www.ag-grid.com/react-data-grid/tool-panel-filters-new/#reference-SelectableFilterParams-defaultFilterIndex)<br>number<br>default: 0<br>If providing `filters`, the index of the filter that should be active by default.                |
| defaultFilterParams [Copy Link](https://www.ag-grid.com/react-data-grid/tool-panel-filters-new/#reference-SelectableFilterParams-defaultFilterParams)<br>FilterWrapperParams<br>Params which will be passed to all filters                                                      |

### Suppressing Filters [Copy Link](https://www.ag-grid.com/react-data-grid/tool-panel-filters-new/#suppressing-filters)

To remove a particular column / filter from the tool panel, set the column property `suppressFiltersToolPanel` to `true`.

|                                                                                                                                                                                                                                                                                                                                                                                     |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| suppressFiltersToolPanel [Copy Link](https://www.ag-grid.com/react-data-grid/tool-panel-filters-new/#reference-filtering-suppressFiltersToolPanel)<br>boolean<br>default: false<br>Set to `true` if you do not want this column (filter) or group (filter group) to appear in the Filters Tool Panel.<br>[ColumnsToolPanelModule](https://www.ag-grid.com/react-data-grid/modules/) |

### Example: Configuring Filters [Copy Link](https://www.ag-grid.com/react-data-grid/tool-panel-filters-new/#example-configuring-filters)

The example below demonstrates configuring filters:

- The **Athlete** column does not show a dropdown as it has `filter: 'agSetColumnFilter'` set.
- The **Age** column shows all three grid-provided filter options by default.
- The **Country** column is configured to show the Set Filter before the Text Filter.
- The **Year** column is configured to show a custom filter component with the Set Filter.
- The **Date** column has `suppressFiltersToolPanel: true` set, so it does not show in the tool panel.

React Example - Tool Panel Filters New - Configuring Filters

Filters

Hide filesViewing: index.jsx

- style.css
- yearFilter.jsx
- index.jsx

Language:JavaScriptTypeScript

```jsx
"use client";

import React, { useCallback, useMemo, useState, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AgGridReact } from "ag-grid-react";
import "./style.css";
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
  ContextMenuModule,
  MultiFilterModule,
  NewFiltersToolPanelModule,
  SetFilterModule,
} from "ag-grid-enterprise";
import YearFilter from "./yearFilter.jsx";

ModuleRegistry.registerModules([\
  NumberFilterModule,\
  DateFilterModule,\
  ClientSideRowModelModule,\
  NewFiltersToolPanelModule,\
  ColumnMenuModule,\
  ContextMenuModule,\
  SetFilterModule,\
  TextFilterModule,\
  MultiFilterModule,\
  ...(process.env.NODE_ENV !== "production" ? [ValidationModule] : []),\
]);

const doesFilterPass = ({ model, node, handlerParams }) => {
  return model ? handlerParams.getValue(node) > 2010 : true;
};

const GridExample = () => {
  const containerStyle = useMemo(() => ({ width: "100%", height: "100%" }), []);
  const gridStyle = useMemo(() => ({ height: "100%", width: "100%" }), []);
  const [rowData, setRowData] = useState();
  const [columnDefs, setColumnDefs] = useState([\
    { field: "athlete", filter: "agSetColumnFilter" },\
    { field: "age" },\
    {\
      field: "country",\
      filterParams: {\
        filters: [\
          {\
            filter: "agSetColumnFilter",\
          },\
          {\
            filter: true, // default filter based on cell data type\
          },\
        ],\
      },\
    },\
    {\
      field: "year",\
      filterParams: {\
        filters: [\
          {\
            filter: { component: YearFilter, doesFilterPass: doesFilterPass },\
            name: "Custom Filter",\
          },\
          {\
            filter: "agSetColumnFilter",\
          },\
        ],\
      },\
    },\
    { field: "date", minWidth: 180, suppressFiltersToolPanel: true },\
    { field: "total", filter: false },\
  ]);
  const defaultColDef = useMemo(() => {
    return {
      flex: 1,
      minWidth: 100,
      filter: "agSelectableColumnFilter",
    };
  }, []);

  const onGridReady = useCallback((params) => {
    fetch("https://www.ag-grid.com/example-assets/olympic-winners.json")
      .then((resp) => resp.json())
      .then((data) =>
        setRowData(
          data.map((rowData) => {
            const dateParts = rowData.date.split("/");
            const [year, month, day] = dateParts
              .reverse()
              .map((e) => parseInt(e, 10));
            const paddedDateTimeStrings = [month, day].map((e) =>
              e.toString().padStart(2, "0"),
            );
            const date = `${year}-${paddedDateTimeStrings[0]}-${paddedDateTimeStrings[1]}`;
            return {
              ...rowData,
              date,
            };
          }),
        ),
      );
  }, []);

  return (
    <div style={containerStyle}>
      <div style={gridStyle}>
        <AgGridReact
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          sideBar={"filters-new"}
          enableFilterHandlers={true}
          suppressSetFilterByDefault={true}
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

## Filters Tool Panel State [Copy Link](https://www.ag-grid.com/react-data-grid/tool-panel-filters-new/#filters-tool-panel-state)

When the grid initialises, the tool panel only shows active filters provided in the [Initial State](https://www.ag-grid.com/react-data-grid/grid-state/) filter model. The tool panel can also be configured via initial state to show inactive filters, or change the order and expansion state. This is provided to the Side Bar state as a `NewFiltersToolPanelState` object:

|                                                                                                                                                                                                                            |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| filters [Copy Link](https://www.ag-grid.com/react-data-grid/tool-panel-filters-new/#reference-NewFiltersToolPanelState-filters)<br>NewFiltersToolPanelFilterState\[\]<br>Ordered list of filters and their expansion state |

React Example - Tool Panel Filters New - State

Athlete

Age

Loading...

Filters

Country

Simple Filter

Contains

Age

is (All)

Add Filter

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
  DateFilterModule,
  GridStateModule,
  ModuleRegistry,
  NumberFilterModule,
  TextFilterModule,
  ValidationModule,
} from "ag-grid-community";
import {
  ColumnMenuModule,
  ContextMenuModule,
  NewFiltersToolPanelModule,
  SetFilterModule,
} from "ag-grid-enterprise";

ModuleRegistry.registerModules([\
  NumberFilterModule,\
  DateFilterModule,\
  ClientSideRowModelModule,\
  NewFiltersToolPanelModule,\
  ColumnMenuModule,\
  ContextMenuModule,\
  SetFilterModule,\
  TextFilterModule,\
  GridStateModule,\
  ...(process.env.NODE_ENV !== "production" ? [ValidationModule] : []),\
]);

const GridExample = () => {
  const containerStyle = useMemo(() => ({ width: "100%", height: "100%" }), []);
  const gridStyle = useMemo(() => ({ height: "100%", width: "100%" }), []);
  const [rowData, setRowData] = useState();
  const [columnDefs, setColumnDefs] = useState([\
    { field: "athlete" },\
    { field: "age" },\
    { field: "country" },\
    { field: "date", minWidth: 180 },\
    { field: "total" },\
  ]);
  const defaultColDef = useMemo(() => {
    return {
      flex: 1,
      minWidth: 100,
      filter: "agSelectableColumnFilter",
    };
  }, []);
  const initialState = useMemo(() => {
    return {
      sideBar: {
        visible: true,
        position: "right",
        openToolPanel: "filters-new",
        toolPanels: {
          "filters-new": {
            filters: [\
              {\
                colId: "country",\
                expanded: true,\
              },\
              {\
                colId: "age",\
              },\
            ],
          },
        },
      },
    };
  }, []);

  const onGridReady = useCallback((params) => {
    fetch("https://www.ag-grid.com/example-assets/olympic-winners.json")
      .then((resp) => resp.json())
      .then((data) =>
        setRowData(
          data.map((rowData) => {
            const dateParts = rowData.date.split("/");
            const [year, month, day] = dateParts
              .reverse()
              .map((e) => parseInt(e, 10));
            const paddedDateTimeStrings = [month, day].map((e) =>
              e.toString().padStart(2, "0"),
            );
            const date = `${year}-${paddedDateTimeStrings[0]}-${paddedDateTimeStrings[1]}`;
            return {
              ...rowData,
              date,
            };
          }),
        ),
      );
  }, []);

  return (
    <div style={containerStyle}>
      <div style={gridStyle}>
        <AgGridReact
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          sideBar={"filters-new"}
          enableFilterHandlers={true}
          suppressSetFilterByDefault={true}
          initialState={initialState}
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

## Filter Instances [Copy Link](https://www.ag-grid.com/react-data-grid/tool-panel-filters-new/#filter-instances)

The filters provided in the tool panel are the same instances as the filter in the column menu. This has the following implications:

- Configuration relating to filters equally applies when the filters appear in the tool panel.
- The filter behaves exactly as when it appears in the column menu. E.g. the Apply button will have the same meaning when used in the tool panel. Also the relationship with the Floating Filter (if active) will be the same.
- If the filter is open on the tool panel and then the user subsequently opens the column menu, the tool panel filter will be closed. Because the filter is the same filter instance, it will only appear at one location at any given time.
