export const configSheetFloorSeed = {
  spreadsheetConfig: {
    title: "Spreadsheet Config",
    tableName: "spreadsheetConfig",
    columns: [
      { header: "Table menu space", columnGroupHeading: "" },
      { header: "ID header", columnGroupHeading: "Spreadsheet Rules" },
      { header: "ID delimiter", columnGroupHeading: "" },
      { header: "Start table column index base 1", columnGroupHeading: "" },
      { header: "Column ID row index base 1", columnGroupHeading: "" },
      {
        header: "Column group heading row index base 1",
        columnGroupHeading: "",
      },
      { header: "Action row index base 1", columnGroupHeading: "" },
      { header: "Table header row index base 1", columnGroupHeading: "" },
    ],
    endpoints: {
      spreadsheetConfig_fillRowIdsTimeLastRan: {
        heading: "Fill Row IDs",
        timeLastRan: { header: "Fill row IDs, time last ran" },
        runStatus: { header: "Fill row IDs, run status" },
      },
      spreadsheetConfig_syncConfigSheetRowsTimeLastRan: {
        heading: "Sync Config Sheet Rows",
        timeLastRan: { header: "Sync config sheet rows, time last ran" },
        runStatus: { header: "Sync config sheet rows, run status" },
      },
    },
  },
  sheetConfig: {
    title: "Sheet Config",
    tableName: "sheetConfig",
    columns: [
      { header: "Sheet GID", columnGroupHeading: "" },
      { header: "Sheet title", columnGroupHeading: "" },
      { header: "ID prefix", columnGroupHeading: "" },
      { header: "ID prefix is unique or empty", columnGroupHeading: "" },
      { header: "Let api access", columnGroupHeading: "" },
    ],
  },
  columnConfig: {
    title: "Column Config",
    tableName: "columnConfig",
    columns: [
      { header: "Sheet GID", columnGroupHeading: "" },
      { header: "Column ID", columnGroupHeading: "" },
      { header: "Sheet title", columnGroupHeading: "" },
      { header: "Header", columnGroupHeading: "" },
      { header: "Empty value allowed", columnGroupHeading: "" },
    ],
  },
  valueConfig: {
    title: "Value Config",
    tableName: "valueConfig",
    columns: [],
  },
} as const;
