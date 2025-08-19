Selection API Reference for Single and Multi-Row Selection

The row selection state can be saved and restored as part of [Grid State](https://www.ag-grid.com/react-data-grid/grid-state/).

## Configuration API [Copy Link](https://www.ag-grid.com/react-data-grid/row-selection-api-reference/#configuration-api)

### Single Row Mode [Copy Link](https://www.ag-grid.com/react-data-grid/row-selection-api-reference/#single-row-mode)

|                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| mode [Copy Link](https://www.ag-grid.com/react-data-grid/row-selection-api-reference/#reference-SingleRowSelectionOptions-mode)<br>'singleRow'<br>'singleRow'                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| enableClickSelection [Copy Link](https://www.ag-grid.com/react-data-grid/row-selection-api-reference/#reference-SingleRowSelectionOptions-enableClickSelection)<br>boolean \| 'enableDeselection' \| 'enableSelection'<br>default: false<br>Modifies the selection behaviour when clicking a row. Choosing `'enableSelection'` allows selection of a row by clicking the row itself. Choosing `'enableDeselection'` allows deselection of a row by CTRL-clicking the row itself. Choosing `true` allows both selection of a row by clicking and deselection of a row by CTRL-clicking. Choosing `false` prevents rows from being selected or deselected by clicking. |
| checkboxes [Copy Link](https://www.ag-grid.com/react-data-grid/row-selection-api-reference/#reference-SingleRowSelectionOptions-checkboxes)<br>boolean \| CheckboxSelectionCallback<br>default: true<br>Set to `true` or return `true` from the callback to render a selection checkbox.                                                                                                                                                                                                                                                                                                                                                                             |
| checkboxLocation [Copy Link](https://www.ag-grid.com/react-data-grid/row-selection-api-reference/#reference-SingleRowSelectionOptions-checkboxLocation)<br>CheckboxLocation<br>default: 'selectionColumn'<br>Configure where checkboxes are displayed. Choosing 'selectionColumn' displays checkboxes in a dedicated selection column. Choosing 'autoGroupColumn' displays checkboxes in the autoGroupColumn. This applies to row checkboxes and header checkboxes.                                                                                                                                                                                                  |
| hideDisabledCheckboxes [Copy Link](https://www.ag-grid.com/react-data-grid/row-selection-api-reference/#reference-SingleRowSelectionOptions-hideDisabledCheckboxes)<br>boolean<br>default: false<br>Set to `true` to hide a disabled checkbox when row is not selectable and checkboxes are enabled.                                                                                                                                                                                                                                                                                                                                                                 |
| isRowSelectable [Copy Link](https://www.ag-grid.com/react-data-grid/row-selection-api-reference/#reference-SingleRowSelectionOptions-isRowSelectable)<br>IsRowSelectable<br>Callback to be used to determine which rows are selectable. By default rows are selectable, so return `false` to make a row non-selectable.                                                                                                                                                                                                                                                                                                                                              |
| copySelectedRows [Copy Link](https://www.ag-grid.com/react-data-grid/row-selection-api-reference/#reference-SingleRowSelectionOptions-copySelectedRows)<br>boolean<br>default: false<br>When enabled and a row is selected, the copy action should copy the entire row, rather than just the focused cell                                                                                                                                                                                                                                                                                                                                                            |
| enableSelectionWithoutKeys [Copy Link](https://www.ag-grid.com/react-data-grid/row-selection-api-reference/#reference-SingleRowSelectionOptions-enableSelectionWithoutKeys)<br>boolean<br>default: false<br>Set to `true` to allow (possibly multiple) rows to be selected and deselected using single click or touch.                                                                                                                                                                                                                                                                                                                                               |
| masterSelects [Copy Link](https://www.ag-grid.com/react-data-grid/row-selection-api-reference/#reference-SingleRowSelectionOptions-masterSelects)<br>'self' \| 'detail'<br>default: 'self'<br>Determines the selection behaviour of master rows with respect to their detail cells. When set to `'self'`, selecting the master row has no effect on the selection state of the detail row. When set to `'detail'`, selecting the master row behaves the same as the header checkbox of the detail grid.                                                                                                                                                              |

### Multi-Row Mode [Copy Link](https://www.ag-grid.com/react-data-grid/row-selection-api-reference/#multi-row-mode)

|                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| mode [Copy Link](https://www.ag-grid.com/react-data-grid/row-selection-api-reference/#reference-MultiRowSelectionOptions-mode)<br>'multiRow'<br>'multiRow'                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| groupSelects [Copy Link](https://www.ag-grid.com/react-data-grid/row-selection-api-reference/#reference-MultiRowSelectionOptions-groupSelects)<br>GroupSelectionMode<br>default: 'self'<br>Determine group selection behaviour                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| selectAll [Copy Link](https://www.ag-grid.com/react-data-grid/row-selection-api-reference/#reference-MultiRowSelectionOptions-selectAll)<br>SelectAllMode<br>default: 'all'<br>Determines how "select all" behaviour works. This controls header checkbox selection.                                                                                                                                                                                                                                                                                                                                                                                                |
| headerCheckbox [Copy Link](https://www.ag-grid.com/react-data-grid/row-selection-api-reference/#reference-MultiRowSelectionOptions-headerCheckbox)<br>boolean<br>default: true<br>If `true` a 'select all' checkbox will be put into the header.                                                                                                                                                                                                                                                                                                                                                                                                                    |
| enableClickSelection [Copy Link](https://www.ag-grid.com/react-data-grid/row-selection-api-reference/#reference-MultiRowSelectionOptions-enableClickSelection)<br>boolean \| 'enableDeselection' \| 'enableSelection'<br>default: false<br>Modifies the selection behaviour when clicking a row. Choosing `'enableSelection'` allows selection of a row by clicking the row itself. Choosing `'enableDeselection'` allows deselection of a row by CTRL-clicking the row itself. Choosing `true` allows both selection of a row by clicking and deselection of a row by CTRL-clicking. Choosing `false` prevents rows from being selected or deselected by clicking. |
| checkboxes [Copy Link](https://www.ag-grid.com/react-data-grid/row-selection-api-reference/#reference-MultiRowSelectionOptions-checkboxes)<br>boolean \| CheckboxSelectionCallback<br>default: true<br>Set to `true` or return `true` from the callback to render a selection checkbox.                                                                                                                                                                                                                                                                                                                                                                             |
| checkboxLocation [Copy Link](https://www.ag-grid.com/react-data-grid/row-selection-api-reference/#reference-MultiRowSelectionOptions-checkboxLocation)<br>CheckboxLocation<br>default: 'selectionColumn'<br>Configure where checkboxes are displayed. Choosing 'selectionColumn' displays checkboxes in a dedicated selection column. Choosing 'autoGroupColumn' displays checkboxes in the autoGroupColumn. This applies to row checkboxes and header checkboxes.                                                                                                                                                                                                  |
| hideDisabledCheckboxes [Copy Link](https://www.ag-grid.com/react-data-grid/row-selection-api-reference/#reference-MultiRowSelectionOptions-hideDisabledCheckboxes)<br>boolean<br>default: false<br>Set to `true` to hide a disabled checkbox when row is not selectable and checkboxes are enabled.                                                                                                                                                                                                                                                                                                                                                                 |
| isRowSelectable [Copy Link](https://www.ag-grid.com/react-data-grid/row-selection-api-reference/#reference-MultiRowSelectionOptions-isRowSelectable)<br>IsRowSelectable<br>Callback to be used to determine which rows are selectable. By default rows are selectable, so return `false` to make a row non-selectable.                                                                                                                                                                                                                                                                                                                                              |
| copySelectedRows [Copy Link](https://www.ag-grid.com/react-data-grid/row-selection-api-reference/#reference-MultiRowSelectionOptions-copySelectedRows)<br>boolean<br>default: false<br>When enabled and a row is selected, the copy action should copy the entire row, rather than just the focused cell                                                                                                                                                                                                                                                                                                                                                            |
| enableSelectionWithoutKeys [Copy Link](https://www.ag-grid.com/react-data-grid/row-selection-api-reference/#reference-MultiRowSelectionOptions-enableSelectionWithoutKeys)<br>boolean<br>default: false<br>Set to `true` to allow (possibly multiple) rows to be selected and deselected using single click or touch.                                                                                                                                                                                                                                                                                                                                               |
| masterSelects [Copy Link](https://www.ag-grid.com/react-data-grid/row-selection-api-reference/#reference-MultiRowSelectionOptions-masterSelects)<br>'self' \| 'detail'<br>default: 'self'<br>Determines the selection behaviour of master rows with respect to their detail cells. When set to `'self'`, selecting the master row has no effect on the selection state of the detail row. When set to `'detail'`, selecting the master row behaves the same as the header checkbox of the detail grid.                                                                                                                                                              |

## Selection Events [Copy Link](https://www.ag-grid.com/react-data-grid/row-selection-api-reference/#selection-events)

There are two events with regards to selection, illustrated in the example below:

|                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| rowSelected [Copy Link](https://www.ag-grid.com/react-data-grid/row-selection-api-reference/#reference-selection-rowSelected)<br>RowSelectedEvent<br>Row is selected or deselected. The event contains the node in question, so call the node's `isSelected()` method to see if it was just selected or deselected.                                                                                                     |
| selectionChanged [Copy Link](https://www.ag-grid.com/react-data-grid/row-selection-api-reference/#reference-selection-selectionChanged)<br>SelectionChangedEvent<br>Row selection is changed. Use the `selectedNodes` field to get the list of selected nodes at the time of the event. When using the SSRM, `selectedNodes` will be `null`<br>when selecting all nodes. Instead, refer to the `serverSideState` field. |

The example below has configured messages to be logged to the developer console on both these events firing. Click a row while the developer console is open to see an illustration of the events.

React Example - Row Selection Api Reference - Selection Events

Hide filesViewing: index.jsx

- index.jsx
- useFetchJson.jsx

Language:JavaScriptTypeScript

```jsx
("use client");

import React, { useCallback, useMemo, useState, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AgGridReact } from "ag-grid-react";
import {
  ClientSideRowModelModule,
  ModuleRegistry,
  RowSelectionModule,
  ValidationModule,
} from "ag-grid-community";

ModuleRegistry.registerModules([\
  RowSelectionModule,\
  ClientSideRowModelModule,\
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
  const rowSelection = useMemo(() => {
    return { mode: "multiRow", headerCheckbox: false };
  }, []);

  const { data, loading } = useFetchJson(
    "https://www.ag-grid.com/example-assets/olympic-winners.json",
  );

  const onRowSelected = useCallback((event) => {
    console.log(
      "row " +
        event.node.data.athlete +
        " selected = " +
        event.node.isSelected(),
    );
  }, []);

  const onSelectionChanged = useCallback((event) => {
    const rowCount = event.selectedNodes?.length;
    console.log("selection changed, " + rowCount + " rows selected");
  }, []);

  return (
    <div style={containerStyle}>
      <div style={gridStyle}>
        <AgGridReact
          rowData={data}
          loading={loading}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          rowSelection={rowSelection}
          onRowSelected={onRowSelected}
          onSelectionChanged={onSelectionChanged}
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

## Node Selection API [Copy Link](https://www.ag-grid.com/react-data-grid/row-selection-api-reference/#node-selection-api)

To select rows programmatically, use the `node.setSelected(params)` method.

|                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| setSelected [Copy Link](https://www.ag-grid.com/react-data-grid/row-selection-api-reference/#reference-selection-setSelected)<br>Function<br>Select (or deselect) the node. <br>- `newValue` \- `true` for selection, `false` for deselection.<br>- `clearSelection` \- If selecting, then passing `true` will select the node exclusively (i.e. NOT do multi select). If doing deselection, `clearSelection` has no impact. |
| isSelected [Copy Link](https://www.ag-grid.com/react-data-grid/row-selection-api-reference/#reference-selection-isSelected)<br>Function<br>Returns:`true` if node is selected. <br>`false` if the node isn't selected. <br>`undefined` if it's partially selected (group where not all children are selected).                                                                                                               |

```jsx
// set selected, keep any other selections
node.setSelected(true);

// set selected, exclusively, remove any other selections
node.setSelected(true, true);

// un-select
node.setSelected(false);

// check status of node selection
const selected = node.isSelected();
```

The `isSelected()` method returns `true` if the node is selected, or `false` if it is not selected. If the node is a group node and the group selection is set to `'children'`, this will return `true` if all child (and grandchild) nodes are selected, `false` if all unselected, or `undefined` if a mixture.

## Grid Selection API [Copy Link](https://www.ag-grid.com/react-data-grid/row-selection-api-reference/#grid-selection-api)

The grid API has the following methods for selection:

|                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| selectAll [Copy Link](https://www.ag-grid.com/react-data-grid/row-selection-api-reference/#reference-selection-selectAll)<br>Function<br>Select all rows. By default this ignores filtering, expansion and pagination settings. Pass the appropriate select all mode as an<br>argument in order to select only rows that satisfy the filter, or those rows on the current page.<br>`mode`: SelectAll mode to use. See `SelectAllMode``source`: Source property that will appear in the `selectionChanged` event, defaults to `'apiSelectAll'`<br>[RowSelectionModule](https://www.ag-grid.com/react-data-grid/modules/)              |
| deselectAll [Copy Link](https://www.ag-grid.com/react-data-grid/row-selection-api-reference/#reference-selection-deselectAll)<br>Function<br>Clear all row selections. By default this ignores filtering, expansion and pagination settings. Pass the appropriate select all mode as an<br>argument in order to select only rows that satisfy the filter, or those rows on the current page.<br>`mode`: SelectAll mode to use. See `SelectAllMode``source`: Source property that will appear in the `selectionChanged` event, defaults to `'apiSelectAll'`<br>[RowSelectionModule](https://www.ag-grid.com/react-data-grid/modules/) |
| getSelectedNodes [Copy Link](https://www.ag-grid.com/react-data-grid/row-selection-api-reference/#reference-selection-getSelectedNodes)<br>Function<br>Returns an unsorted list of selected nodes.<br>Getting the underlying node (rather than the data) is useful when working with tree / aggregated data,<br>as the node can be traversed.<br>[RowSelectionModule](https://www.ag-grid.com/react-data-grid/modules/)                                                                                                                                                                                                              |
| getSelectedRows [Copy Link](https://www.ag-grid.com/react-data-grid/row-selection-api-reference/#reference-selection-getSelectedRows)<br>Function<br>Returns an unsorted list of selected rows (i.e. row data that you provided).<br>[RowSelectionModule](https://www.ag-grid.com/react-data-grid/modules/)                                                                                                                                                                                                                                                                                                                          |
| setNodesSelected [Copy Link](https://www.ag-grid.com/react-data-grid/row-selection-api-reference/#reference-selection-setNodesSelected)<br>Function<br>Set all of the provided nodes selection state to the provided value.<br>[RowSelectionModule](https://www.ag-grid.com/react-data-grid/modules/)                                                                                                                                                                                                                                                                                                                                |

If you want to select only the filtered rows, you could do this using the following:

```js
// loop through each node after filter
const nodes = [];
api.forEachNodeAfterFilter(node => {
  nodes.push(node);
});
api.setNodesSelected({ nodes, newValue: true });
```
