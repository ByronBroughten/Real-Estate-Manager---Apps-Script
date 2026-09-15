import { Obj } from "../utils/Obj";
import { Val } from "../utils/Val";
import type { CellValue } from "./base";
import type {
  GridCellSnapshot,
  GridFetchRange,
  LocalWriteOperation,
  RawSource,
  SheetSnapshot,
  SpreadsheetSnapshot,
  TableColumnSnapshot,
  TableSnapshot,
} from "./RawSource";
import type { RgbColor } from "./RgbColor";

export type OpaqueRawRequest = GoogleAppsScript.Sheets.Schema.Request;

type GoogleSpreadsheet = GoogleAppsScript.Sheets.Schema.Spreadsheet;
type GoogleSheet = GoogleAppsScript.Sheets.Schema.Sheet;
type GoogleCellData = GoogleAppsScript.Sheets.Schema.CellData;
type GoogleColor = GoogleAppsScript.Sheets.Schema.Color;
type BatchUpdateRequest =
  GoogleAppsScript.Sheets.Schema.BatchUpdateSpreadsheetRequest;
type BatchUpdateResponse =
  GoogleAppsScript.Sheets.Schema.BatchUpdateSpreadsheetResponse;
type GetByDataFilterRequest =
  GoogleAppsScript.Sheets.Schema.GetSpreadsheetByDataFilterRequest;
type UserEnteredValue = NonNullable<
  NonNullable<
    GoogleAppsScript.Sheets.Schema.UpdateCellsRequest["rows"]
  >[number]["values"]
>[number]["userEnteredValue"];

interface FieldsArg {
  fields?: string;
}

const SHEETS_API_BASE = "https://sheets.googleapis.com/v4/spreadsheets";

const SHEET_PROPERTIES_FIELDS =
  "sheets(properties(sheetId,title),tables(tableId,range))";
const GRID_FIELDS_WITH_PROGRAMMATIC_FACTS =
  "sheets(" +
  "properties(sheetId,title)," +
  "tables(tableId,range,columnProperties(columnIndex,columnType,dataValidationRule(condition(type,values(userEnteredValue)))))," +
  "data(startColumn,startRow,columnMetadata,rowData(values(effectiveValue,userEnteredValue,effectiveFormat(numberFormat(type)),dataValidation(condition(type)))))" +
  ")";
const GRID_FIELDS_WITHOUT_PROGRAMMATIC_FACTS =
  "sheets(" +
  "properties(sheetId,title)," +
  "tables(tableId,range)," +
  "data(startColumn,startRow,columnMetadata,rowData(values(effectiveValue)))" +
  ")";

export interface SheetsHttpRequest {
  method: "GET" | "POST";
  url: string;
  body: string | null;
}

export type SheetsHttpTransport = (request: SheetsHttpRequest) => unknown;

export interface GoogleSheetsAPIHttpProps {
  spreadsheetId: string;
  transport: SheetsHttpTransport;
  isDryRun: boolean;
  reportRequests: (requests: OpaqueRawRequest[]) => void;
}

export interface SheetsAdvancedTransport {
  Spreadsheets: {
    get: (
      spreadsheetId: string,
      optionalArgs?: FieldsArg,
    ) => GoogleSpreadsheet;
    getByDataFilter: (
      resource: GetByDataFilterRequest,
      spreadsheetId: string,
      optionalArgs?: FieldsArg,
    ) => GoogleSpreadsheet;
    batchUpdate: (
      resource: BatchUpdateRequest,
      spreadsheetId: string,
    ) => BatchUpdateResponse;
  };
}

/**
 * Google adapter for RawSource: the only module that may construct or
 * consume Google Sheets schema types or call Spreadsheets.get /
 * getByDataFilter / batchUpdate. SpreadsheetRaw holds a RawSource.
 * HTTP transport lives here so Node does not install a Sheets global.
 * docs/architecture/round-trips.md, queued-writes.md, how-it-runs.md
 */
export class GoogleSheetsAPI implements RawSource {
  private sheets: SheetsAdvancedTransport;
  constructor(sheets: SheetsAdvancedTransport) {
    this.sheets = sheets;
  }
  static init(sheets: SheetsAdvancedTransport): GoogleSheetsAPI {
    return new GoogleSheetsAPI(sheets);
  }
  static forAppsScript(): GoogleSheetsAPI {
    return GoogleSheetsAPI.init(
      Val.assert(Sheets, "Sheets (enable the Advanced Sheets Service)"),
    );
  }
  static initHttp(props: GoogleSheetsAPIHttpProps): GoogleSheetsAPI {
    return GoogleSheetsAPI.init(httpSheetsTransport(props));
  }
  fetchSheetProperties(spreadsheetId: string): SpreadsheetSnapshot {
    return toSpreadsheetSnapshot(
      this.sheets.Spreadsheets.get(spreadsheetId, {
        fields: SHEET_PROPERTIES_FIELDS,
      }),
    );
  }
  fetchGrid(
    spreadsheetId: string,
    gridRanges: GridFetchRange[],
    options: { includeProgrammaticFacts: boolean },
  ): SpreadsheetSnapshot {
    return toSpreadsheetSnapshot(
      this.sheets.Spreadsheets.getByDataFilter(
        {
          dataFilters: gridRanges.map((gr) => ({ gridRange: gr })),
          includeGridData: true,
        },
        spreadsheetId,
        {
          fields: options.includeProgrammaticFacts
            ? GRID_FIELDS_WITH_PROGRAMMATIC_FACTS
            : GRID_FIELDS_WITHOUT_PROGRAMMATIC_FACTS,
        },
      ),
    );
  }
  flush(spreadsheetId: string, operations: LocalWriteOperation[]): void {
    const requests = operations.flatMap(localOperationToGoogleRequests);
    if (requests.length === 0) return;
    this.sheets.Spreadsheets.batchUpdate({ requests }, spreadsheetId);
  }
}

function httpSheetsTransport(
  props: GoogleSheetsAPIHttpProps,
): SheetsAdvancedTransport {
  // The one place the wire is trusted, as Apps Script's own declaration trusts it.
  const send = <T>(request: SheetsHttpRequest): T =>
    props.transport(request) as T;
  const url = (spreadsheetId: string, suffix: string, fields?: string) => {
    if (spreadsheetId !== props.spreadsheetId) {
      throw new Error(
        `The Node host is bound to spreadsheet "${props.spreadsheetId}" but was asked for "${spreadsheetId}".`,
      );
    }
    const query = fields ? `?fields=${encodeURIComponent(fields)}` : "";
    return `${SHEETS_API_BASE}/${spreadsheetId}${suffix}${query}`;
  };
  return {
    Spreadsheets: {
      get: (spreadsheetId, optionalArgs) =>
        send<GoogleSpreadsheet>({
          method: "GET",
          url: url(spreadsheetId, "", optionalArgs?.fields),
          body: null,
        }),
      getByDataFilter: (resource, spreadsheetId, optionalArgs) =>
        send<GoogleSpreadsheet>({
          method: "POST",
          url: url(spreadsheetId, ":getByDataFilter", optionalArgs?.fields),
          body: JSON.stringify(resource),
        }),
      batchUpdate: (resource, spreadsheetId) => {
        props.reportRequests(resource.requests ?? []);
        if (props.isDryRun) {
          return {};
        }
        return send<BatchUpdateResponse>({
          method: "POST",
          url: url(spreadsheetId, ":batchUpdate"),
          body: JSON.stringify(resource),
        });
      },
    },
  };
}

function toSpreadsheetSnapshot(
  spreadsheet: GoogleSpreadsheet,
): SpreadsheetSnapshot {
  return {
    sheets: Val.assert(spreadsheet.sheets, "spreadsheet.sheets").map(
      toSheetSnapshot,
    ),
  };
}

function toSheetSnapshot(sheet: GoogleSheet): SheetSnapshot {
  const properties = Val.assert(sheet.properties, "sheet.properties");
  return {
    sheetGid: Val.assert(properties.sheetId, "sheetId"),
    title: properties.title ?? null,
    tables: sheet.tables?.map(toTableSnapshot),
    gridBlocks: sheet.data?.map((block) => ({
      startColumn: block.startColumn ?? 0,
      startRow: block.startRow ?? 0,
      columnCount: (block.columnMetadata || []).length,
      rows: (block.rowData || []).map((row) => ({
        cells: Array.from({ length: (block.columnMetadata || []).length }, (
          _,
          colOffset,
        ) => toGridCell(row.values?.[colOffset])),
      })),
    })),
  };
}

function toTableSnapshot(
  table: NonNullable<GoogleSheet["tables"]>[number],
): TableSnapshot {
  const range = table.range;
  return {
    tableId: Val.assert(table.tableId, "tableId"),
    startRowIndex: Val.assert(range?.startRowIndex, "startRowIndex"),
    endRowIndex: Val.assert(range?.endRowIndex, "endRowIndex"),
    startColumnIndex: Val.assert(range?.startColumnIndex, "startColumnIndex"),
    endColumnIndex: Val.assert(range?.endColumnIndex, "endColumnIndex"),
    columnProperties: (table.columnProperties ?? []).map(toTableColumnSnapshot),
  };
}

function toTableColumnSnapshot(
  colProps: NonNullable<
    NonNullable<GoogleSheet["tables"]>[number]["columnProperties"]
  >[number],
): TableColumnSnapshot {
  const values = (colProps.dataValidationRule?.condition?.values ?? [])
    .map((conditionValue) => conditionValue.userEnteredValue)
    .filter((value): value is string => value !== undefined);
  return {
    columnIndex: colProps.columnIndex,
    columnType: colProps.columnType,
    dataValidationValues: values,
    dataValidationConditionType: colProps.dataValidationRule?.condition?.type,
  };
}

function toGridCell(
  cell: GoogleCellData | undefined,
): GridCellSnapshot | undefined {
  if (cell === undefined) return undefined;
  const backgroundColor = cell.userEnteredFormat?.backgroundColor;
  return {
    value: effectiveCellValue(cell),
    isFormula: cell.userEnteredValue?.formulaValue !== undefined,
    numberFormatType: cell.effectiveFormat?.numberFormat?.type,
    dataValidationConditionType: cell.dataValidation?.condition?.type,
    ...(backgroundColor !== undefined
      ? { backgroundColor: googleColorToRgb(backgroundColor) }
      : {}),
  };
}

function effectiveCellValue(cell: GoogleCellData): CellValue | "" {
  const effectiveValue = cell.effectiveValue;
  if (effectiveValue === undefined) {
    return "";
  }
  if ("stringValue" in effectiveValue) {
    return Val.assert(effectiveValue.stringValue, "stringValue");
  }
  if ("boolValue" in effectiveValue) {
    return Val.assert(effectiveValue.boolValue, "boolValue");
  }
  if ("numberValue" in effectiveValue) {
    return Val.assert(effectiveValue.numberValue, "numberValue");
  }
  return "";
}

function localOperationToGoogleRequests(
  operation: LocalWriteOperation,
): OpaqueRawRequest[] {
  switch (operation.kind) {
    case "appendRows":
      return [
        {
          appendCells: {
            sheetId: operation.sheetId,
            tableId: operation.tableId,
            rows: Array.from({ length: operation.emptyRowCount }, () => ({})),
            fields: "userEnteredValue",
          },
        },
      ];
    case "insertColumn":
      return [
        {
          insertDimension: {
            range: {
              sheetId: operation.sheetId,
              dimension: "COLUMNS",
              startIndex: operation.startColumnIndex,
              endIndex: operation.startColumnIndex + 1,
            },
            inheritFromBefore: false, // Let the formatting and column header colors be natural.
          },
        },
      ];
    case "fill":
      return formulaAndCellDataRequests(operation, {
        sheetId: operation.sheetId,
        rowIndex: operation.startRowIndex,
        columnIndex: operation.colIndex,
        rowCount: operation.endRowIndex - operation.startRowIndex,
      }, (cell, fields) => ({
        repeatCell: {
          range: {
            sheetId: operation.sheetId,
            startRowIndex: operation.startRowIndex,
            endRowIndex: operation.endRowIndex,
            startColumnIndex: operation.colIndex,
            endColumnIndex: operation.colIndex + 1,
          },
          cell,
          fields,
        },
      }));
    case "updateCell":
      return formulaAndCellDataRequests(operation, {
        sheetId: operation.sheetId,
        rowIndex: operation.rowIndex,
        columnIndex: operation.colIndex,
        rowCount: 1,
      }, (cell, fields) => ({
        updateCells: {
          range: {
            sheetId: operation.sheetId,
            startRowIndex: operation.rowIndex,
            endRowIndex: operation.rowIndex + 1,
            startColumnIndex: operation.colIndex,
            endColumnIndex: operation.colIndex + 1,
          },
          rows: [{ values: [cell] }],
          fields,
        },
      }));
    case "findReplace":
      return [
        {
          findReplace: { ...operation.terms, ...operation.scope },
        },
      ];
    case "deleteRows":
      return [
        {
          deleteDimension: {
            range: {
              sheetId: operation.sheetId,
              dimension: "ROWS",
              startIndex: operation.startIndex,
              endIndex: operation.endIndex,
            },
          },
        },
      ];
    case "sort":
      return [
        {
          sortRange: {
            range: {
              sheetId: operation.sheetId,
              startRowIndex: operation.startRowIndex,
              startColumnIndex: operation.startColumnIndex,
            },
            sortSpecs: [
              {
                dimensionIndex: operation.colIdxToSortBy,
                sortOrder: operation.sortOrder,
              },
            ],
          },
        },
      ];
    case "raw":
      return [operation.request as OpaqueRawRequest];
    default: {
      const exhaustive: never = operation;
      throw new Error(`Unknown local write operation: ${JSON.stringify(exhaustive)}`);
    }
  }
}

function formulaAndCellDataRequests(
  change: CellDataChange & { formula?: string },
  pasteProps: {
    sheetId: number;
    rowIndex: number;
    columnIndex: number;
    rowCount: number;
  },
  cellRequest: (cell: GoogleCellData, fields: string) => OpaqueRawRequest,
): OpaqueRawRequest[] {
  const requests: OpaqueRawRequest[] = [];
  if (change.formula !== undefined) {
    requests.push(
      formulaPasteDataRequest({ ...pasteProps, formula: change.formula }),
    );
  }
  if (!cellChangeHasCellData(change)) return requests;
  requests.push(
    cellRequest(cellChangeToCellData(change), cellChangeFieldMask(change)),
  );
  return requests;
}

function formulaPasteDataRequest(props: {
  sheetId: number;
  rowIndex: number;
  columnIndex: number;
  formula: string;
  rowCount: number;
}): OpaqueRawRequest {
  const field = `"${props.formula.replaceAll('"', '""')}"`;
  return {
    pasteData: {
      coordinate: {
        sheetId: props.sheetId,
        rowIndex: props.rowIndex,
        columnIndex: props.columnIndex,
      },
      data: Array.from({ length: props.rowCount }, () => field).join("\n"),
      delimiter: "\t",
      type: "PASTE_FORMULA",
    },
  };
}

function rgbToGoogleColor(color: RgbColor): GoogleColor {
  return {
    red: color.red,
    green: color.green,
    blue: color.blue,
    alpha: color.alpha,
  };
}

function googleColorToRgb(color: GoogleColor): RgbColor {
  return {
    red: color.red,
    green: color.green,
    blue: color.blue,
    alpha: color.alpha,
  };
}

type CellDataChange = {
  value?: CellValue;
  backgroundColor?: RgbColor;
};

const cellChangeFields = {
  value: "userEnteredValue",
  backgroundColor: "userEnteredFormat.backgroundColor",
} as const satisfies Record<keyof CellDataChange, string>;

function cellChangeHasCellData(change: CellDataChange): boolean {
  return change.value !== undefined || change.backgroundColor !== undefined;
}

function cellChangeFieldMask(change: CellDataChange): string {
  return Obj.keys(cellChangeFields)
    .filter((key) => change[key] !== undefined)
    .map((key) => cellChangeFields[key])
    .join(",");
}

function cellChangeToCellData(change: CellDataChange): GoogleCellData {
  const data: GoogleCellData = {};
  if (change.value !== undefined) {
    data.userEnteredValue = cellValueToUserEntered(change.value);
  }
  if (change.backgroundColor !== undefined) {
    data.userEnteredFormat = {
      backgroundColor: rgbToGoogleColor(change.backgroundColor),
    };
  }
  return data;
}

function cellValueToUserEntered(value: CellValue): UserEnteredValue {
  if (typeof value === "string") {
    return { stringValue: value };
  }
  if (typeof value === "number") {
    return { numberValue: value };
  }
  if (typeof value === "boolean") {
    return { boolValue: value };
  }
  throw new Error(
    `Cannot make user entered value for unsupported type "${typeof value}".`,
  );
}
