import type { TableColumnType } from "../00_Source/RawSource/RawSource";
import { Obj } from "../utils/Obj";
import {
  getColumnTraitByName,
  getSheetColumnNames,
} from "./columnConfigsTypes";
import { sheetConfigsByGid } from "./sheetConfigsTypes";

export type FloorColumnType = Extract<
  TableColumnType,
  "TEXT" | "DOUBLE" | "BOOLEAN"
>;

export interface FloorSeedColumn {
  header: string;
  columnType: FloorColumnType;
  emptyValueAllowed: boolean;
  dataValue?: string;
}

interface FloorSeedSheet {
  title: string;
  tableName: string;
  letApiAccess: boolean;
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
    letApiAccess: true,
    columns: [
      {
        header: "Table menu space",
        columnGroupHeading: "",
        columnType: "TEXT",
        emptyValueAllowed: false,
        dataValue: "Not used",
      },
      {
        header: "ID header",
        columnGroupHeading: "Spreadsheet Rules",
        columnType: "TEXT",
        emptyValueAllowed: false,
      },
      {
        header: "ID delimiter",
        columnGroupHeading: "",
        columnType: "TEXT",
        emptyValueAllowed: false,
      },
      {
        header: "Start table column index base 1",
        columnGroupHeading: "",
        columnType: "DOUBLE",
        emptyValueAllowed: false,
      },
      {
        header: "Column ID row index base 1",
        columnGroupHeading: "",
        columnType: "DOUBLE",
        emptyValueAllowed: false,
      },
      {
        header: "Column group heading row index base 1",
        columnGroupHeading: "",
        columnType: "DOUBLE",
        emptyValueAllowed: false,
      },
      {
        header: "Action row index base 1",
        columnGroupHeading: "",
        columnType: "DOUBLE",
        emptyValueAllowed: false,
      },
      {
        header: "Table header row index base 1",
        columnGroupHeading: "",
        columnType: "DOUBLE",
        emptyValueAllowed: false,
      },
    ],
    endpoints: {
      spreadsheetConfig_fillRowIdsTimeLastRan: {
        heading: "Fill Row IDs",
        timeLastRan: {
          header: "Fill row IDs, time last ran",
          columnType: "TEXT",
          emptyValueAllowed: false,
        },
        runStatus: {
          header: "Fill row IDs, run status",
          columnType: "TEXT",
          emptyValueAllowed: false,
        },
      },
      spreadsheetConfig_syncConfigSheetRowsTimeLastRan: {
        heading: "Sync Config Sheet Rows",
        timeLastRan: {
          header: "Sync config sheet rows, time last ran",
          columnType: "TEXT",
          emptyValueAllowed: false,
        },
        runStatus: {
          header: "Sync config sheet rows, run status",
          columnType: "TEXT",
          emptyValueAllowed: false,
        },
      },
    },
  },
  sheetConfig: {
    title: "Sheet Config",
    tableName: "sheetConfig",
    letApiAccess: true,
    columns: [
      {
        header: "Sheet GID",
        columnGroupHeading: "",
        columnType: "DOUBLE",
        emptyValueAllowed: false,
      },
      {
        header: "Sheet title",
        columnGroupHeading: "",
        columnType: "TEXT",
        emptyValueAllowed: false,
      },
      {
        header: "Let api access",
        columnGroupHeading: "",
        columnType: "BOOLEAN",
        emptyValueAllowed: false,
      },
    ],
  },
  columnConfig: {
    title: "Column Config",
    tableName: "columnConfig",
    letApiAccess: true,
    columns: [
      {
        header: "Sheet GID",
        columnGroupHeading: "",
        columnType: "DOUBLE",
        emptyValueAllowed: false,
      },
      {
        header: "Column ID",
        columnGroupHeading: "",
        columnType: "TEXT",
        emptyValueAllowed: false,
      },
      {
        header: "Sheet title",
        columnGroupHeading: "",
        columnType: "TEXT",
        emptyValueAllowed: false,
      },
      {
        header: "Header",
        columnGroupHeading: "",
        columnType: "TEXT",
        emptyValueAllowed: false,
      },
      {
        header: "Empty value allowed",
        columnGroupHeading: "",
        columnType: "BOOLEAN",
        emptyValueAllowed: false,
      },
    ],
  },
  valueConfig: {
    title: "Value Config",
    tableName: "valueConfig",
    letApiAccess: true,
    columns: [],
  },
} as const satisfies Record<string, FloorSeedSheet>;

export type FloorTabName = keyof typeof configSheetFloorSeed;

export function isFloorTabName(name: string): name is FloorTabName {
  return Object.hasOwn(configSheetFloorSeed, name);
}

export function floorTabSeedByGid(
  sheetGid: number,
): (typeof configSheetFloorSeed)[FloorTabName] | undefined {
  const sheetConfig = sheetConfigsByGid.get(sheetGid);
  if (sheetConfig === undefined || !isFloorTabName(sheetConfig.sheetName)) {
    return undefined;
  }
  return configSheetFloorSeed[sheetConfig.sheetName];
}

export function floorSeedColumns(
  sheetName: FloorTabName,
): readonly FloorSeedColumn[] {
  if (sheetName === "valueConfig") return [];
  if (sheetName !== "spreadsheetConfig") {
    return configSheetFloorSeed[sheetName].columns;
  }
  return [
    ...configSheetFloorSeed.spreadsheetConfig.columns,
    ...Obj.values(configSheetFloorSeed.spreadsheetConfig.endpoints).flatMap(
      (endpoint) => [endpoint.timeLastRan, endpoint.runStatus],
    ),
  ];
}

export function floorSeedColumnById(
  sheetGid: number,
  columnId: string,
): FloorSeedColumn | undefined {
  const sheetConfig = sheetConfigsByGid.get(sheetGid);
  if (sheetConfig === undefined || !isFloorTabName(sheetConfig.sheetName)) {
    return undefined;
  }
  return floorSeedColumnInSheet(sheetConfig.sheetName, columnId);
}

function floorSeedColumnInSheet(
  sheetName: FloorTabName,
  columnId: string,
): FloorSeedColumn | undefined {
  return floorSeedColumns(sheetName).find((seedColumn) => {
    const columnName = getSheetColumnNames(sheetName).find(
      (name) =>
        getColumnTraitByName(sheetName, name, "header") === seedColumn.header,
    );
    if (columnName === undefined) return false;
    return getColumnTraitByName(sheetName, columnName, "columnId") === columnId;
  });
}

export interface FloorSeedLookup {
  tabNames: readonly FloorTabName[];
  columns(sheetName: FloorTabName): readonly FloorSeedColumn[];
  columnById(
    sheetName: FloorTabName,
    columnId: string,
  ): FloorSeedColumn | undefined;
}

// Handed to makeConfigs' constructors, which can't import this module without a cycle through the generated files.
export const floorSeedLookup: FloorSeedLookup = {
  tabNames: Obj.keys(configSheetFloorSeed),
  columns: floorSeedColumns,
  columnById: floorSeedColumnInSheet,
};
