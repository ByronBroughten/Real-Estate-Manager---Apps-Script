import type { TableColumnType } from "../00_Source/RawSource/RawSource";

export interface FloorSeedColumn {
  header: string;
  columnType: TableColumnType;
}

interface FloorSeedSheet {
  title: string;
  tableName: string;
  columns: readonly (FloorSeedColumn & { columnGroupHeading: string })[];
  endpoints?: Record<
    string,
    {
      heading: string;
      timeLastRan: FloorSeedColumn;
      runStatus: FloorSeedColumn;
    }
  >;
}

export const configSheetFloorSeed = {
  spreadsheetConfig: {
    title: "Spreadsheet Config",
    tableName: "spreadsheetConfig",
    columns: [
      {
        header: "Table menu space",
        columnGroupHeading: "",
        columnType: "TEXT",
      },
      {
        header: "ID header",
        columnGroupHeading: "Spreadsheet Rules",
        columnType: "TEXT",
      },
      { header: "ID delimiter", columnGroupHeading: "", columnType: "TEXT" },
      {
        header: "Start table column index base 1",
        columnGroupHeading: "",
        columnType: "DOUBLE",
      },
      {
        header: "Column ID row index base 1",
        columnGroupHeading: "",
        columnType: "DOUBLE",
      },
      {
        header: "Column group heading row index base 1",
        columnGroupHeading: "",
        columnType: "DOUBLE",
      },
      {
        header: "Action row index base 1",
        columnGroupHeading: "",
        columnType: "DOUBLE",
      },
      {
        header: "Table header row index base 1",
        columnGroupHeading: "",
        columnType: "DOUBLE",
      },
    ],
    endpoints: {
      spreadsheetConfig_fillRowIdsTimeLastRan: {
        heading: "Fill Row IDs",
        timeLastRan: {
          header: "Fill row IDs, time last ran",
          columnType: "TEXT",
        },
        runStatus: { header: "Fill row IDs, run status", columnType: "TEXT" },
      },
      spreadsheetConfig_syncConfigSheetRowsTimeLastRan: {
        heading: "Sync Config Sheet Rows",
        timeLastRan: {
          header: "Sync config sheet rows, time last ran",
          columnType: "TEXT",
        },
        runStatus: {
          header: "Sync config sheet rows, run status",
          columnType: "TEXT",
        },
      },
    },
  },
  sheetConfig: {
    title: "Sheet Config",
    tableName: "sheetConfig",
    columns: [
      { header: "Sheet GID", columnGroupHeading: "", columnType: "DOUBLE" },
      { header: "Sheet title", columnGroupHeading: "", columnType: "TEXT" },
      {
        header: "Let api access",
        columnGroupHeading: "",
        columnType: "BOOLEAN",
      },
    ],
  },
  columnConfig: {
    title: "Column Config",
    tableName: "columnConfig",
    columns: [
      { header: "Sheet GID", columnGroupHeading: "", columnType: "DOUBLE" },
      { header: "Column ID", columnGroupHeading: "", columnType: "TEXT" },
      { header: "Sheet title", columnGroupHeading: "", columnType: "TEXT" },
      { header: "Header", columnGroupHeading: "", columnType: "TEXT" },
      {
        header: "Empty value allowed",
        columnGroupHeading: "",
        columnType: "BOOLEAN",
      },
    ],
  },
  valueConfig: {
    title: "Value Config",
    tableName: "valueConfig",
    columns: [],
  },
} as const satisfies Record<string, FloorSeedSheet>;
