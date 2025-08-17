Cell selection allows Excel-like selection of ranges of cells. Cell selections are useful for visually highlighting data, copying data to the [Clipboard](https://www.ag-grid.com/react-data-grid/clipboard/), or for doing aggregations using the [Status Bar](https://www.ag-grid.com/react-data-grid/status-bar/).

## Enabling Cell Selection [Copy Link](https://www.ag-grid.com/react-data-grid/cell-selection/#enabling-cell-selection)

Cell Selection is enabled by setting the `gridOptions.cellSelection` to `true`, or to a configuration object.

```jsx
const cellSelection = true;

<AgGridReact cellSelection={cellSelection} />;
```

When enabled, ranges can be selected in the following ways:

- **Mouse Drag:** Click the mouse down on a cell and drag and release the mouse over another cell. A range will be created between the two cells and clear any existing ranges.

- **Ctrl & Mouse Drag:** Holding `^ Ctrl` key while creating a range using mouse drag **outside an existing range** will create a new cell range selection and keep any existing ranges.

- **Shift & Click:** Clicking on one cell to focus that cell, then holding down `⇧ Shift` while clicking another cell, will create a range between both cells.

- **Shift & Arrow Keys:** Focusing a cell and then holding down `⇧ Shift` and using the arrow keys will create a range starting from the focused cell.

- **Ctrl & Shift & Arrow Keys:** Focusing a cell and then holding down `^ Ctrl` \+ `⇧ Shift` and using the arrow keys will create a range starting from the focused cell to the last cell in the direction of the Arrow pressed.

### Cell Range Deselection [Copy Link](https://www.ag-grid.com/react-data-grid/cell-selection/#cell-range-deselection)

It is possible to deselect part of existing ranges in the following ways:

- **Ctrl & Mouse Drag:** Holding `^ Ctrl` and dragging a range starting **within an existing range** will cause any cells covered by the new range to be deselected.

- **Ctrl & Click:** Holding `^ Ctrl` and clicking a cell will deselect just that cell.

Note that deselecting part of a range can split the range into multiple ranges, since individual ranges have the limitation of being rectangular.

The example below demonstrates simple cell selection. Cell ranges can be selected in all the ways described above.

React Example - Cell Selection - Range Selection

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
  ValidationModule,
} from "ag-grid-community";
import {
  CellSelectionModule,
  ClipboardModule,
  ColumnMenuModule,
  ContextMenuModule,
} from "ag-grid-enterprise";

ModuleRegistry.registerModules([\
  ClientSideRowModelModule,\
  ClipboardModule,\
  ColumnMenuModule,\
  ContextMenuModule,\
  CellSelectionModule,\
  ...(process.env.NODE_ENV !== "production" ? [ValidationModule] : []),\
]);
import { useFetchJson } from "./useFetchJson";

const GridExample = () => {
  const containerStyle = useMemo(() => ({ width: "100%", height: "100%" }), []);
  const gridStyle = useMemo(() => ({ height: "100%", width: "100%" }), []);

  const [columnDefs, setColumnDefs] = useState([\
    { field: "athlete", minWidth: 150 },\
    { field: "age", maxWidth: 90 },\
    { field: "country", minWidth: 150 },\
    { field: "year", maxWidth: 90 },\
    { field: "date", minWidth: 150 },\
    { field: "sport", minWidth: 150 },\
    { field: "gold" },\
    { field: "silver" },\
    { field: "bronze" },\
    { field: "total" },\
  ]);
  const defaultColDef = useMemo(() => {
    return {
      flex: 1,
      minWidth: 100,
    };
  }, []);

  const { data, loading } = useFetchJson(
    "https://www.ag-grid.com/example-assets/small-olympic-winners.json",
  );

  return (
    <div style={containerStyle}>
      <div style={gridStyle}>
        <AgGridReact
          rowData={data}
          loading={loading}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          cellSelection={true}
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

## Prevent Selection of Multiple Ranges [Copy Link](https://www.ag-grid.com/react-data-grid/cell-selection/#prevent-selection-of-multiple-ranges)

By default multiple ranges can be selected. To restrict cell selection to a single range, even if the `^ Ctrl` key is held down, set `cellSelection.suppressMultiRanges` to `true`.

```jsx
const cellSelection = useMemo(() => {
  return {
    suppressMultiRanges: true,
  };
}, []);

<AgGridReact cellSelection={cellSelection} />;
```

The following example demonstrates single range cell selection:

React Example - Cell Selection - Range Selection Suppress Multi

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
  NumberEditorModule,
  TextEditorModule,
  ValidationModule,
} from "ag-grid-community";
import {
  CellSelectionModule,
  ClipboardModule,
  ColumnMenuModule,
  ContextMenuModule,
} from "ag-grid-enterprise";

ModuleRegistry.registerModules([\
  NumberEditorModule,\
  TextEditorModule,\
  ClientSideRowModelModule,\
  ClipboardModule,\
  ColumnMenuModule,\
  ContextMenuModule,\
  CellSelectionModule,\
  ...(process.env.NODE_ENV !== "production" ? [ValidationModule] : []),\
]);
import { useFetchJson } from "./useFetchJson";

const GridExample = () => {
  const containerStyle = useMemo(() => ({ width: "100%", height: "100%" }), []);
  const gridStyle = useMemo(() => ({ height: "100%", width: "100%" }), []);

  const [columnDefs, setColumnDefs] = useState([\
    { field: "athlete", minWidth: 150 },\
    { field: "age", maxWidth: 90 },\
    { field: "country", minWidth: 150 },\
    { field: "year", maxWidth: 90 },\
    { field: "date", minWidth: 150 },\
    { field: "sport", minWidth: 150 },\
    { field: "gold" },\
    { field: "silver" },\
    { field: "bronze" },\
    { field: "total" },\
  ]);
  const defaultColDef = useMemo(() => {
    return {
      flex: 1,
      minWidth: 100,
      editable: true,
    };
  }, []);
  const cellSelection = useMemo(() => {
    return { suppressMultiRanges: true };
  }, []);

  const { data, loading } = useFetchJson(
    "https://www.ag-grid.com/example-assets/small-olympic-winners.json",
  );

  return (
    <div style={containerStyle}>
      <div style={gridStyle}>
        <AgGridReact
          rowData={data}
          loading={loading}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          cellSelection={cellSelection}
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

## Ranges with Pinned Columns and Rows [Copy Link](https://www.ag-grid.com/react-data-grid/cell-selection/#ranges-with-pinned-columns-and-rows)

It is possible to select a cell range that spans pinned and non-pinned sections of the grid. If you do this, the selected range will not have any gaps with regards to the column or row order.

For example, if you start the drag on the left pinned area and drag to the right pinned area, then all of the columns in the centre area will also be part of the range. Likewise with pinned rows, no row gaps will occur if a cell range spans into pinned rows. A range will be continuous between the rows pinned to the top, the centre, and the rows pinned to the bottom.

This can be thought of as follows: if you have a grid with pinned rows and / or columns, then 'flatten out' the grid in your head so that all rows and columns are visible, then the cell selection will work as you would expect in the flattened out version where only full rectangles can be selectable.

React Example - Cell Selection - Range Selection Pinned Areas

Hide filesViewing: index.jsx

- index.jsx
- useFetchJson.jsx

Language:JavaScriptTypeScript

```jsx
"use client";

import React, { useCallback, useMemo, useState, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AgGridReact } from "ag-grid-react";
import {
  ClientSideRowModelModule,
  ModuleRegistry,
  PinnedRowModule,
  ValidationModule,
} from "ag-grid-community";
import {
  CellSelectionModule,
  ClipboardModule,
  ColumnMenuModule,
  ContextMenuModule,
} from "ag-grid-enterprise";

ModuleRegistry.registerModules([\
  ClientSideRowModelModule,\
  ClipboardModule,\
  ColumnMenuModule,\
  ContextMenuModule,\
  CellSelectionModule,\
  PinnedRowModule,\
  ...(process.env.NODE_ENV !== "production" ? [ValidationModule] : []),\
]);
import { useFetchJson } from "./useFetchJson";

const GridExample = () => {
  const containerStyle = useMemo(() => ({ width: "100%", height: "100%" }), []);
  const gridStyle = useMemo(() => ({ height: "100%", width: "100%" }), []);

  const [columnDefs, setColumnDefs] = useState([\
    { field: "athlete", minWidth: 150, pinned: "left" },\
    { field: "age", maxWidth: 90 },\
    { field: "country", minWidth: 150 },\
    { field: "year", maxWidth: 90 },\
    { field: "date", minWidth: 150 },\
    { field: "sport", minWidth: 150 },\
    { field: "gold" },\
    { field: "silver" },\
    { field: "bronze" },\
    { field: "total", pinned: "right" },\
  ]);
  const defaultColDef = useMemo(() => {
    return {
      flex: 1,
      minWidth: 100,
    };
  }, []);
  const isRowPinned = useCallback((node) => {
    const country = node.data?.country;
    return country == "Norway" ? "top" : null;
  }, []);

  const { data, loading } = useFetchJson(
    "https://www.ag-grid.com/example-assets/small-olympic-winners.json",
  );

  return (
    <div style={containerStyle}>
      <div style={gridStyle}>
        <AgGridReact
          rowData={data}
          loading={loading}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          cellSelection={true}
          enableRowPinning={true}
          isRowPinned={isRowPinned}
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

## Highlight Headers [Copy Link](https://www.ag-grid.com/react-data-grid/cell-selection/#highlight-headers)

It is possible to highlight the Grid Headers that are part of a range by setting the `cellSelection.enableHeaderHighlight` to `true`.

```jsx
const cellSelection = useMemo(() => {
  return {
    enableHeaderHighlight: true,
  };
}, []);

<AgGridReact cellSelection={cellSelection} />;
```

React Example - Cell Selection - Range Selection Highlight Headers

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
  ValidationModule,
} from "ag-grid-community";
import {
  CellSelectionModule,
  ClipboardModule,
  ColumnMenuModule,
  ContextMenuModule,
} from "ag-grid-enterprise";

ModuleRegistry.registerModules([\
  ClientSideRowModelModule,\
  ClipboardModule,\
  ColumnMenuModule,\
  ContextMenuModule,\
  CellSelectionModule,\
  ...(process.env.NODE_ENV !== "production" ? [ValidationModule] : []),\
]);
import { useFetchJson } from "./useFetchJson";

const GridExample = () => {
  const containerStyle = useMemo(() => ({ width: "100%", height: "100%" }), []);
  const gridStyle = useMemo(() => ({ height: "100%", width: "100%" }), []);

  const [columnDefs, setColumnDefs] = useState([\
    { field: "athlete", minWidth: 150 },\
    { field: "age", maxWidth: 90 },\
    { field: "country", minWidth: 150 },\
    { field: "year", maxWidth: 90 },\
    { field: "date", minWidth: 150 },\
    { field: "sport", minWidth: 150 },\
    { field: "gold" },\
    { field: "silver" },\
    { field: "bronze" },\
    { field: "total" },\
  ]);
  const defaultColDef = useMemo(() => {
    return {
      flex: 1,
      minWidth: 100,
    };
  }, []);
  const cellSelection = useMemo(() => {
    return {
      enableHeaderHighlight: true,
    };
  }, []);

  const { data, loading } = useFetchJson(
    "https://www.ag-grid.com/example-assets/small-olympic-winners.json",
  );

  return (
    <div style={containerStyle}>
      <div style={gridStyle}>
        <AgGridReact
          rowData={data}
          loading={loading}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          cellSelection={cellSelection}
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

## Copy Cell Range Down [Copy Link](https://www.ag-grid.com/react-data-grid/cell-selection/#copy-cell-range-down)

When you have more than one row selected in a range, pressing keys `^ Ctrl` + `D` will copy the top row values to all other rows in the selected range.

By default, the Value Formatter and Value Parser will be used whilst copying the range via the [Use Value Formatter For Export](https://www.ag-grid.com/react-data-grid/value-formatters/#formatting-for-export) and [Use Value Parser for Import](https://www.ag-grid.com/react-data-grid/value-parsers/#use-value-parser-for-import) features.

## Bulk Cell Edit [Copy Link](https://www.ag-grid.com/react-data-grid/cell-selection/#bulk-cell-edit)

When [Cell Editing](https://www.ag-grid.com/react-data-grid/cell-editing/) is enabled, and a cell range is selected, typing to enter a new value and pressing the `^ Ctrl` + `↵ Enter` keys will set the newly provided cell value to all the editable cells in the selected cell range.

## Delete Cell Range [Copy Link](https://www.ag-grid.com/react-data-grid/cell-selection/#delete-cell-range)

When [Cell Editing](https://www.ag-grid.com/react-data-grid/cell-editing/) is enabled, pressing the `Delete` key will clear all of the cells in the range (by setting the cell values to `null`). If your column uses a `valueParser`, it will receive an empty string ( `''`) as the new value.

This will also emit the following events:

|                                                                                                                                                                                                                                        |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| cellSelectionDeleteStart [Copy Link](https://www.ag-grid.com/react-data-grid/cell-selection/#reference-editing-cellSelectionDeleteStart)<br>CellSelectionDeleteStartEvent<br>Cell selection delete operation (cell clear) has started. |
| cellSelectionDeleteEnd [Copy Link](https://www.ag-grid.com/react-data-grid/cell-selection/#reference-editing-cellSelectionDeleteEnd)<br>CellSelectionDeleteEndEvent<br>Cell selection delete operation (cell clear) has ended.         |

## API Reference [Copy Link](https://www.ag-grid.com/react-data-grid/cell-selection/#api-reference)

The cell selection state can be saved and restored as part of [Grid State](https://www.ag-grid.com/react-data-grid/grid-state/).

Here you can find a full list of configuration options available in `'cell'` mode.

|                                                                                                                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| suppressMultiRanges [Copy Link](https://www.ag-grid.com/react-data-grid/cell-selection/#reference-CellSelectionOptions-suppressMultiRanges)<br>boolean<br>default: false<br>If `true`, only a single range can be selected                                               |
| enableHeaderHighlight [Copy Link](https://www.ag-grid.com/react-data-grid/cell-selection/#reference-CellSelectionOptions-enableHeaderHighlight)<br>boolean<br>If `true` the header of cells containing ranges will be highlighted.                                       |
| handle [Copy Link](https://www.ag-grid.com/react-data-grid/cell-selection/#reference-CellSelectionOptions-handle)<br>RangeHandleOptions \| FillHandleOptions<br>Determine the selection handle behaviour. Can be used to configure the range handle and the fill handle. |
