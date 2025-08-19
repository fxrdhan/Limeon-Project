This section covers how to configure the Side Bar which contains Tool Panels.

## Configuring the Side Bar [Copy Link](https://www.ag-grid.com/react-data-grid/side-bar/#configuring-the-side-bar)

The Side Bar is configured using the grid property `sideBar`. The property takes multiple forms to allow easy configuration or more advanced configuration. The different forms for the `sideBar` property are as follows:

| Type                        | Description                                                                                                                                                                                                                                                                                                                                                                          |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `undefined` / `null`        | No Side Bar provided.                                                                                                                                                                                                                                                                                                                                                                |
| `boolean`                   | Set to `true` to display the Side Bar with default configuration.                                                                                                                                                                                                                                                                                                                    |
| `string` / `string[]`       | Set to `'columns'`, `'filters'` or `'filters-new'` to display the Side Bar with just one of [Columns](https://www.ag-grid.com/react-data-grid/tool-panel-columns/), [Filters](https://www.ag-grid.com/react-data-grid/tool-panel-filters/) or [New Filters](https://www.ag-grid.com/react-data-grid/tool-panel-filters-new/) Tool Panels or an array of some or all of these values. |
| `SideBarDef`<br>(long form) | An object of type `SideBarDef` (explained below) to allow detailed configuration of the Side Bar. Use this to configure the provided Tool Panels (e.g. pass parameters to the columns or filters panel) or to include custom Tool Panels.                                                                                                                                            |

### Boolean Configuration [Copy Link](https://www.ag-grid.com/react-data-grid/side-bar/#boolean-configuration)

The default Side Bar contains the Columns and Filters Tool Panels. To use the default Side Bar, set the grid property `sideBar=true`. The Columns panel will be open by default.

The default configuration doesn't allow customisation of the Tool Panels.

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
  TextFilterModule,
  ValidationModule,
} from "ag-grid-community";
import {
  ColumnsToolPanelModule,
  FiltersToolPanelModule,
  PivotModule,
  SetFilterModule,
} from "ag-grid-enterprise";

ModuleRegistry.registerModules([\
  NumberFilterModule,\
  ClientSideRowModelModule,\
  ColumnsToolPanelModule,\
  FiltersToolPanelModule,\
  SetFilterModule,\
  PivotModule,\
  TextFilterModule,\
  ...(process.env.NODE_ENV !== "production" ? [ValidationModule] : []),\
]);
import { useFetchJson } from "./useFetchJson";

const GridExample = () => {
  const containerStyle = useMemo(() => ({ width: "100%", height: "100%" }), []);
  const gridStyle = useMemo(() => ({ height: "100%", width: "100%" }), []);

  const [columnDefs, setColumnDefs] = useState([\
    { field: "athlete", filter: "agTextColumnFilter", minWidth: 200 },\
    { field: "age" },\
    { field: "country", minWidth: 180 },\
    { field: "year" },\
    { field: "date", minWidth: 150 },\
    { field: "gold" },\
    { field: "silver" },\
    { field: "bronze" },\
    { field: "total" },\
  ]);
  const defaultColDef = useMemo(() => {
    return {
      flex: 1,
      minWidth: 100,
      // allow every column to be aggregated
      enableValue: true,
      // allow every column to be grouped
      enableRowGroup: true,
      // allow every column to be pivoted
      enablePivot: true,
      filter: true,
    };
  }, []);
  const autoGroupColumnDef = useMemo(() => {
    return {
      minWidth: 200,
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
          defaultColDef={defaultColDef}
          autoGroupColumnDef={autoGroupColumnDef}
          sideBar={true}
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

### String Configuration [Copy Link](https://www.ag-grid.com/react-data-grid/side-bar/#string-configuration)

To display just one of the provided Tool Panels, set either `sideBar='columns'`, `sideBar='filters'` or `sideBar='filters-new'`. This will display the desired item with default configuration. Alternatively pass some or all of these values as a `string[]`, i.e `sideBar=['columns','filters', 'filters-new']`.

The example below demonstrates using the string configuration. Note the following:

- The grid property `sideBar` is set to `'filters'`.
- The Side Bar is displayed showing only the Filters panel.

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
  TextFilterModule,
  ValidationModule,
} from "ag-grid-community";
import {
  ColumnsToolPanelModule,
  FiltersToolPanelModule,
  PivotModule,
  SetFilterModule,
} from "ag-grid-enterprise";

ModuleRegistry.registerModules([\
  NumberFilterModule,\
  ClientSideRowModelModule,\
  ColumnsToolPanelModule,\
  FiltersToolPanelModule,\
  SetFilterModule,\
  PivotModule,\
  TextFilterModule,\
  ...(process.env.NODE_ENV !== "production" ? [ValidationModule] : []),\
]);
import { useFetchJson } from "./useFetchJson";

const GridExample = () => {
  const containerStyle = useMemo(() => ({ width: "100%", height: "100%" }), []);
  const gridStyle = useMemo(() => ({ height: "100%", width: "100%" }), []);

  const [columnDefs, setColumnDefs] = useState([\
    { field: "athlete", filter: "agTextColumnFilter", minWidth: 200 },\
    { field: "age" },\
    { field: "country", minWidth: 180 },\
    { field: "year" },\
    { field: "date", minWidth: 150 },\
    { field: "gold" },\
    { field: "silver" },\
    { field: "bronze" },\
    { field: "total" },\
  ]);
  const defaultColDef = useMemo(() => {
    return {
      flex: 1,
      minWidth: 100,
      // allow every column to be aggregated
      enableValue: true,
      // allow every column to be grouped
      enableRowGroup: true,
      // allow every column to be pivoted
      enablePivot: true,
      filter: true,
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

### SideBarDef Configuration [Copy Link](https://www.ag-grid.com/react-data-grid/side-bar/#sidebardef-configuration)

The previous configurations are shortcuts for the full fledged configuration using a `SideBarDef` object. For full control over the configuration, you must provide a `SideBarDef` object.

Properties available on the `SideBarDef` interface.

|                                                                                                                                                                                                                                                                        |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| toolPanels [Copy Link](https://www.ag-grid.com/react-data-grid/side-bar/#reference-SideBarDef-toolPanels)<br>(ToolPanelDef \| string)\[\]<br>A list of all the panels to place in the side bar. The panels will be displayed in the provided order from top to bottom. |
| defaultToolPanel [Copy Link](https://www.ag-grid.com/react-data-grid/side-bar/#reference-SideBarDef-defaultToolPanel)<br>string<br>The panel (identified by ID) to open by default. If none specified, the side bar is initially displayed closed.                     |
| hiddenByDefault [Copy Link](https://www.ag-grid.com/react-data-grid/side-bar/#reference-SideBarDef-hiddenByDefault)<br>boolean<br>To hide the side bar by default, set this to `true`. If left undefined the side bar will be shown.                                   |
| position [Copy Link](https://www.ag-grid.com/react-data-grid/side-bar/#reference-SideBarDef-position)<br>'left' \| 'right'<br>Sets the side bar position relative to the grid.                                                                                         |

The `toolPanels` property follows the `ToolPanelDef` interface:

Properties available on the `ToolPanelDef` interface.

|                                                                                                                                                                                                                                                                                                                                                 |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| id [Copy Link](https://www.ag-grid.com/react-data-grid/side-bar/#reference-ToolPanelDef-id)<br>string<br>The unique ID for this panel. Used in the API and elsewhere to refer to the panel.                                                                                                                                                     |
| labelKey [Copy Link](https://www.ag-grid.com/react-data-grid/side-bar/#reference-ToolPanelDef-labelKey)<br>string<br>The key used for localisation for displaying the label. The label is displayed in the tab button.                                                                                                                          |
| labelDefault [Copy Link](https://www.ag-grid.com/react-data-grid/side-bar/#reference-ToolPanelDef-labelDefault)<br>string<br>The default label if `labelKey` is missing or does not map to valid text through localisation.                                                                                                                     |
| minWidth [Copy Link](https://www.ag-grid.com/react-data-grid/side-bar/#reference-ToolPanelDef-minWidth)<br>number<br>default: 100<br>The min width of the tool panel.                                                                                                                                                                           |
| maxWidth [Copy Link](https://www.ag-grid.com/react-data-grid/side-bar/#reference-ToolPanelDef-maxWidth)<br>number<br>The max width of the tool panel.                                                                                                                                                                                           |
| width [Copy Link](https://www.ag-grid.com/react-data-grid/side-bar/#reference-ToolPanelDef-width)<br>number<br>default: $side-bar-panel-width (theme variable)<br>The initial width of the tool panel.                                                                                                                                          |
| iconKey [Copy Link](https://www.ag-grid.com/react-data-grid/side-bar/#reference-ToolPanelDef-iconKey)<br>string<br>The key of the icon to be used as a graphical aid beside the label in the side bar.                                                                                                                                          |
| toolPanel [Copy Link](https://www.ag-grid.com/react-data-grid/side-bar/#reference-ToolPanelDef-toolPanel)<br>any<br>The tool panel component to use as the panel. The provided panels use components `agColumnsToolPanel`, `agFiltersToolPanel` and `agNewFiltersToolPanel`. To provide your own custom panel component, you reference it here. |
| toolPanelParams [Copy Link](https://www.ag-grid.com/react-data-grid/side-bar/#reference-ToolPanelDef-toolPanelParams)<br>any<br>Customise the parameters provided to the `toolPanel` component.                                                                                                                                                 |

The following snippet shows configuring the Tool Panel using a `SideBarDef` object:

```jsx
const sideBar = useMemo(() => {
	return {
        toolPanels: [\
            {\
                id: 'columns',\
                labelDefault: 'Columns',\
                labelKey: 'columns',\
                iconKey: 'columns',\
                toolPanel: 'agColumnsToolPanel',\
                minWidth: 225,\
                maxWidth: 225,\
                width: 225\
            },\
            {\
                id: 'filters',\
                labelDefault: 'Filters',\
                labelKey: 'filters',\
                iconKey: 'filter',\
                toolPanel: 'agFiltersToolPanel',\
                minWidth: 180,\
                maxWidth: 400,\
                width: 250\
            }\
        ],
        position: 'left',
        defaultToolPanel: 'filters'
    };
}, []);

<AgGridReact sideBar={sideBar} />
```

The snippet above is demonstrated in the following example:

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
  TextFilterModule,
  ValidationModule,
} from "ag-grid-community";
import {
  ColumnsToolPanelModule,
  FiltersToolPanelModule,
  PivotModule,
  SetFilterModule,
} from "ag-grid-enterprise";

ModuleRegistry.registerModules([\
  NumberFilterModule,\
  ClientSideRowModelModule,\
  ColumnsToolPanelModule,\
  FiltersToolPanelModule,\
  SetFilterModule,\
  PivotModule,\
  TextFilterModule,\
  ...(process.env.NODE_ENV !== "production" ? [ValidationModule] : []),\
]);
import { useFetchJson } from "./useFetchJson";

const GridExample = () => {
  const containerStyle = useMemo(() => ({ width: "100%", height: "100%" }), []);
  const gridStyle = useMemo(() => ({ height: "100%", width: "100%" }), []);

  const [columnDefs, setColumnDefs] = useState([\
    { field: "athlete", filter: "agTextColumnFilter", minWidth: 200 },\
    { field: "age" },\
    { field: "country", minWidth: 180 },\
    { field: "year" },\
    { field: "date", minWidth: 150 },\
    { field: "gold" },\
    { field: "silver" },\
    { field: "bronze" },\
    { field: "total" },\
  ]);
  const defaultColDef = useMemo(() => {
    return {
      flex: 1,
      minWidth: 100,
      // allow every column to be aggregated
      enableValue: true,
      // allow every column to be grouped
      enableRowGroup: true,
      // allow every column to be pivoted
      enablePivot: true,
      filter: true,
    };
  }, []);
  const autoGroupColumnDef = useMemo(() => {
    return {
      minWidth: 200,
    };
  }, []);
  const sideBar = useMemo(() => {
    return {
      toolPanels: [\
        {\
          id: "columns",\
          labelDefault: "Columns",\
          labelKey: "columns",\
          iconKey: "columns",\
          toolPanel: "agColumnsToolPanel",\
          minWidth: 225,\
          width: 225,\
          maxWidth: 225,\
        },\
        {\
          id: "filters",\
          labelDefault: "Filters",\
          labelKey: "filters",\
          iconKey: "filter",\
          toolPanel: "agFiltersToolPanel",\
          minWidth: 180,\
          maxWidth: 400,\
          width: 250,\
        },\
      ],
      position: "left",
      defaultToolPanel: "filters",
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
          defaultColDef={defaultColDef}
          autoGroupColumnDef={autoGroupColumnDef}
          sideBar={sideBar}
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

## Configuration Shortcuts [Copy Link](https://www.ag-grid.com/react-data-grid/side-bar/#configuration-shortcuts)

The `boolean` and `string` configurations are shortcuts for more detailed configurations. When you use a shortcut the grid replaces it with the equivalent long form of the configuration by building the equivalent `SideBarDef`.

The following code snippets show an example of the `boolean` shortcut and the equivalent `SideBarDef` long form.

```jsx
// shortcut
const sideBar = true;

<AgGridReact sideBar={sideBar} />;
```

```jsx
// equivalent detailed long form
const sideBar = useMemo(() => {
	return {
        toolPanels: [\
            {\
                id: 'columns',\
                labelDefault: 'Columns',\
                labelKey: 'columns',\
                iconKey: 'columns',\
                toolPanel: 'agColumnsToolPanel',\
            },\
            {\
                id: 'filters',\
                labelDefault: 'Filters',\
                labelKey: 'filters',\
                iconKey: 'filter',\
                toolPanel: 'agFiltersToolPanel',\
            }\
        ],
        defaultToolPanel: 'columns',
    };
}, []);

<AgGridReact sideBar={sideBar} />
```

The following code snippets show an example of the `string` shortcut and the equivalent `SideBarDef` long form.

```jsx
// shortcut
const sideBar = 'filters';

<AgGridReact sideBar={sideBar} />;
```

```jsx
// equivalent detailed long form
const sideBar = useMemo(() => {
	return {
        toolPanels: [\
            {\
                id: 'filters',\
                labelDefault: 'Filters',\
                labelKey: 'filters',\
                iconKey: 'filter',\
                toolPanel: 'agFiltersToolPanel',\
            }\
        ],
        defaultToolPanel: 'filters',
    };
}, []);

<AgGridReact sideBar={sideBar} />
```

You can also use shortcuts inside the `sideBar.toolPanels` array for specifying the Columns and Filters items.

```jsx
// shortcut
const sideBar = useMemo(() => {
  return {
    toolPanels: ['columns', 'filters'],
  };
}, []);

<AgGridReact sideBar={sideBar} />;
```

```jsx
// equivalent detailed long form
const sideBar = useMemo(() => {
	return {
        toolPanels: [\
            {\
                id: 'columns',\
                labelDefault: 'Columns',\
                labelKey: 'columns',\
                iconKey: 'columns',\
                toolPanel: 'agColumnsToolPanel',\
            },\
            {\
                id: 'filters',\
                labelDefault: 'Filters',\
                labelKey: 'filters',\
                iconKey: 'filter',\
                toolPanel: 'agFiltersToolPanel',\
            }\
        ]
    };
}, []);

<AgGridReact sideBar={sideBar} />
```

## Side Bar Customisation [Copy Link](https://www.ag-grid.com/react-data-grid/side-bar/#side-bar-customisation)

If you are using the long form (providing a `SideBarDef` object) then it is possible to customise. The example below changes the filter label and icon.

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
  TextFilterModule,
  ValidationModule,
} from "ag-grid-community";
import {
  ColumnsToolPanelModule,
  FiltersToolPanelModule,
  PivotModule,
  SetFilterModule,
} from "ag-grid-enterprise";

ModuleRegistry.registerModules([\
  NumberFilterModule,\
  ClientSideRowModelModule,\
  ColumnsToolPanelModule,\
  FiltersToolPanelModule,\
  SetFilterModule,\
  PivotModule,\
  TextFilterModule,\
  ...(process.env.NODE_ENV !== "production" ? [ValidationModule] : []),\
]);
import { useFetchJson } from "./useFetchJson";

const GridExample = () => {
  const containerStyle = useMemo(() => ({ width: "100%", height: "100%" }), []);
  const gridStyle = useMemo(() => ({ height: "100%", width: "100%" }), []);

  const [columnDefs, setColumnDefs] = useState([\
    { field: "athlete", filter: "agTextColumnFilter", minWidth: 200 },\
    { field: "age" },\
    { field: "country", minWidth: 180 },\
    { field: "year" },\
    { field: "date", minWidth: 150 },\
    { field: "gold" },\
    { field: "silver" },\
    { field: "bronze" },\
    { field: "total" },\
  ]);
  const defaultColDef = useMemo(() => {
    return {
      flex: 1,
      minWidth: 100,
      // allow every column to be aggregated
      enableValue: true,
      // allow every column to be grouped
      enableRowGroup: true,
      // allow every column to be pivoted
      enablePivot: true,
      filter: true,
    };
  }, []);
  const autoGroupColumnDef = useMemo(() => {
    return {
      minWidth: 200,
    };
  }, []);
  const sideBar = useMemo(() => {
    return {
      toolPanels: [\
        "columns",\
        {\
          id: "filters",\
          labelKey: "filters",\
          labelDefault: "Filters",\
          iconKey: "menu",\
          toolPanel: "agFiltersToolPanel",\
        },\
        {\
          id: "filters 2",\
          labelKey: "filters",\
          labelDefault: "Filters XXXXXXXX",\
          iconKey: "filter",\
          toolPanel: "agFiltersToolPanel",\
        },\
      ],
      defaultToolPanel: "filters",
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
          defaultColDef={defaultColDef}
          autoGroupColumnDef={autoGroupColumnDef}
          sideBar={sideBar}
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

## Providing Parameters to Tool Panels [Copy Link](https://www.ag-grid.com/react-data-grid/side-bar/#providing-parameters-to-tool-panels)

Parameters are passed to Tool Panels via the `toolPanelParams` object. For example, the following code snippet sets `suppressRowGroups: true` and `suppressValues: true` for the [Columns Tool Panel](https://www.ag-grid.com/react-data-grid/tool-panel-columns/).

```jsx
const sideBar = useMemo(() => {
	return {
        toolPanels: [\
            {\
                id: 'columns',\
                labelDefault: 'Columns',\
                labelKey: 'columns',\
                iconKey: 'columns',\
                toolPanel: 'agColumnsToolPanel',\
                toolPanelParams: {\
                    suppressRowGroups: true,\
                    suppressValues: true,\
                }\
            }\
        ]
    };
}, []);

<AgGridReact sideBar={sideBar} />
```

See the [Columns Tool Panel](https://www.ag-grid.com/react-data-grid/tool-panel-columns/) documentation for the full list of possible parameters to this Tool Panel.

## Side Bar API [Copy Link](https://www.ag-grid.com/react-data-grid/side-bar/#side-bar-api)

The Side Bar state can be saved and restored as part of [Grid State](https://www.ag-grid.com/react-data-grid/grid-state/).

The list below details all the API methods relevant to the Tool Panel.

|                                                                                                                                                                                                                                                                                                            |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| getSideBar [Copy Link](https://www.ag-grid.com/react-data-grid/side-bar/#reference-accessories-getSideBar)<br>Function<br>Returns the current side bar configuration. If a shortcut was used, returns the detailed long form.<br>[SideBarModule](https://www.ag-grid.com/react-data-grid/modules/)         |
| setSideBarVisible [Copy Link](https://www.ag-grid.com/react-data-grid/side-bar/#reference-accessories-setSideBarVisible)<br>Function<br>Show/hide the entire side bar, including any visible panel and the tab buttons.<br>[SideBarModule](https://www.ag-grid.com/react-data-grid/modules/)               |
| isSideBarVisible [Copy Link](https://www.ag-grid.com/react-data-grid/side-bar/#reference-accessories-isSideBarVisible)<br>Function<br>Returns `true` if the side bar is visible.<br>[SideBarModule](https://www.ag-grid.com/react-data-grid/modules/)                                                      |
| setSideBarPosition [Copy Link](https://www.ag-grid.com/react-data-grid/side-bar/#reference-accessories-setSideBarPosition)<br>Function<br>Sets the side bar position relative to the grid. Possible values are `'left'` or `'right'`.<br>[SideBarModule](https://www.ag-grid.com/react-data-grid/modules/) |
| openToolPanel [Copy Link](https://www.ag-grid.com/react-data-grid/side-bar/#reference-accessories-openToolPanel)<br>Function<br>Opens a particular tool panel. Provide the ID of the tool panel to open.<br>[SideBarModule](https://www.ag-grid.com/react-data-grid/modules/)                              |
| closeToolPanel [Copy Link](https://www.ag-grid.com/react-data-grid/side-bar/#reference-accessories-closeToolPanel)<br>Function<br>Closes the currently open tool panel (if any).<br>[SideBarModule](https://www.ag-grid.com/react-data-grid/modules/)                                                      |
| getOpenedToolPanel [Copy Link](https://www.ag-grid.com/react-data-grid/side-bar/#reference-accessories-getOpenedToolPanel)<br>Function<br>Returns the ID of the currently shown tool panel if any, otherwise `null`.<br>[SideBarModule](https://www.ag-grid.com/react-data-grid/modules/)                  |
| isToolPanelShowing [Copy Link](https://www.ag-grid.com/react-data-grid/side-bar/#reference-accessories-isToolPanelShowing)<br>Function<br>Returns `true` if the tool panel is showing, otherwise `false`.<br>[SideBarModule](https://www.ag-grid.com/react-data-grid/modules/)                             |
| refreshToolPanel [Copy Link](https://www.ag-grid.com/react-data-grid/side-bar/#reference-accessories-refreshToolPanel)<br>Function<br>Force refreshes all tool panels by calling their `refresh` method.<br>[SideBarModule](https://www.ag-grid.com/react-data-grid/modules/)                              |
| getToolPanelInstance [Copy Link](https://www.ag-grid.com/react-data-grid/side-bar/#reference-accessories-getToolPanelInstance)<br>Function<br>Gets the tool panel instance corresponding to the supplied `id`.<br>[SideBarModule](https://www.ag-grid.com/react-data-grid/modules/)                        |

The example below demonstrates different usages of the Tool Panel API methods. The following can be noted:

- Initially the Side Bar is not visible as `sideBar.hiddenByDefault=true`.
- **Visibility Buttons:** These toggle visibility of the Tool Panel. Note that when you make `visible=false`, the entire Tool Panel is hidden including the tabs. Make sure the Tool Panel is left visible before testing the other API features so you can see the impact.
- **Open / Close Buttons:** These open and close different Tool Panel items.
- **Reset Buttons:** These reset the Tool Panel to a new configuration. Notice that [shortcuts](https://www.ag-grid.com/react-data-grid/side-bar/#configuration-shortcuts) are provided as configuration however `getSideBar()` returns back the long form.
- **Position Buttons:** These change the position of the Side Bar relative to the grid.
- The `get*` buttons log data to the developer console.

Hide filesViewing: index.jsx

- style.css
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
import "./style.css";
import {
  ClientSideRowModelModule,
  ModuleRegistry,
  NumberFilterModule,
  TextFilterModule,
  ValidationModule,
} from "ag-grid-community";
import {
  ColumnsToolPanelModule,
  FiltersToolPanelModule,
  PivotModule,
  SetFilterModule,
} from "ag-grid-enterprise";

ModuleRegistry.registerModules([\
  NumberFilterModule,\
  ClientSideRowModelModule,\
  ColumnsToolPanelModule,\
  FiltersToolPanelModule,\
  SetFilterModule,\
  PivotModule,\
  TextFilterModule,\
  ...(process.env.NODE_ENV !== "production" ? [ValidationModule] : []),\
]);
import { useFetchJson } from "./useFetchJson";

const GridExample = () => {
  const gridRef = useRef(null);
  const containerStyle = useMemo(() => ({ width: "100%", height: "100%" }), []);
  const gridStyle = useMemo(() => ({ height: "100%", width: "100%" }), []);

  const [columnDefs, setColumnDefs] = useState([\
    { field: "athlete", filter: "agTextColumnFilter", minWidth: 200 },\
    { field: "age" },\
    { field: "country", minWidth: 200 },\
    { field: "year" },\
    { field: "date", minWidth: 160 },\
    { field: "gold" },\
    { field: "silver" },\
    { field: "bronze" },\
    { field: "total" },\
  ]);
  const defaultColDef = useMemo(() => {
    return {
      flex: 1,
      minWidth: 100,
      // allow every column to be aggregated
      enableValue: true,
      // allow every column to be grouped
      enableRowGroup: true,
      // allow every column to be pivoted
      enablePivot: true,
      filter: true,
    };
  }, []);
  const autoGroupColumnDef = useMemo(() => {
    return {
      minWidth: 200,
    };
  }, []);
  const sideBar = useMemo(() => {
    return {
      toolPanels: [\
        {\
          id: "columns",\
          labelDefault: "Columns",\
          labelKey: "columns",\
          iconKey: "columns",\
          toolPanel: "agColumnsToolPanel",\
        },\
        {\
          id: "filters",\
          labelDefault: "Filters",\
          labelKey: "filters",\
          iconKey: "filter",\
          toolPanel: "agFiltersToolPanel",\
        },\
      ],
      defaultToolPanel: "filters",
      hiddenByDefault: true,
    };
  }, []);

  const { data, loading } = useFetchJson(
    "https://www.ag-grid.com/example-assets/olympic-winners.json",
  );

  const onToolPanelVisibleChanged = useCallback((event) => {
    console.log("toolPanelVisibleChanged", event);
  }, []);

  const onToolPanelSizeChanged = useCallback((event) => {
    console.log("toolPanelSizeChanged", event);
  }, []);

  const setSideBarVisible = useCallback((value) => {
    gridRef.current.api.setSideBarVisible(value);
  }, []);

  const isSideBarVisible = useCallback(() => {
    console.log(gridRef.current.api.isSideBarVisible());
  }, []);

  const openToolPanel = useCallback((key) => {
    gridRef.current.api.openToolPanel(key);
  }, []);

  const closeToolPanel = useCallback(() => {
    gridRef.current.api.closeToolPanel();
  }, []);

  const getOpenedToolPanel = useCallback(() => {
    console.log(gridRef.current.api.getOpenedToolPanel());
  }, []);

  const setSideBar = useCallback((def) => {
    gridRef.current.api.setGridOption("sideBar", def);
  }, []);

  const getSideBar = useCallback(() => {
    const sideBar = gridRef.current.api.getSideBar();
    console.log(JSON.stringify(sideBar));
    console.log(sideBar);
  }, []);

  const setSideBarPosition = useCallback((position) => {
    gridRef.current.api.setSideBarPosition(position);
  }, []);

  return (
    <div style={containerStyle}>
      <div className="parent-div">
        <div className="api-panel">
          <div className="api-column">
            Visibility
            <button onClick={() => setSideBarVisible(true)}>
              setSideBarVisible(true)
            </button>
            <button onClick={() => setSideBarVisible(false)}>
              setSideBarVisible(false)
            </button>
            <button onClick={isSideBarVisible}>isSideBarVisible()</button>
          </div>
          <div className="api-column">
            Open &amp; Close
            <button onClick={() => openToolPanel("columns")}>
              openToolPanel('columns')
            </button>
            <button onClick={() => openToolPanel("filters")}>
              openToolPanel('filters')
            </button>
            <button onClick={closeToolPanel}>closeToolPanel()</button>
            <button onClick={getOpenedToolPanel}>getOpenedToolPanel()</button>
          </div>
          <div className="api-column">
            Reset
            <button onClick={() => setSideBar(["filters", "columns"])}>
              setSideBar(['filters','columns'])
            </button>
            <button onClick={() => setSideBar("columns")}>
              setSideBar('columns')
            </button>
            <button onClick={getSideBar}>getSideBar()</button>
          </div>
          <div className="api-column">
            Position
            <button onClick={() => setSideBarPosition("left")}>
              setSideBarPosition('left')
            </button>
            <button onClick={() => setSideBarPosition("right")}>
              setSideBarPosition('right')
            </button>
          </div>
        </div>

        <div style={gridStyle} className="grid-div">
          <AgGridReact
            ref={gridRef}
            rowData={data}
            loading={loading}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            autoGroupColumnDef={autoGroupColumnDef}
            sideBar={sideBar}
            onToolPanelVisibleChanged={onToolPanelVisibleChanged}
            onToolPanelSizeChanged={onToolPanelSizeChanged}
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
