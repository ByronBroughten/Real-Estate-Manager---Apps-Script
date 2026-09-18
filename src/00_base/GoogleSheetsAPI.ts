import { Obj } from "../utils/Obj";
import { Val } from "../utils/Val";
import type { CellValue } from "./base";
import {
  isModelledConditionType,
  quantizeConditionalFormat,
  type BooleanCondition,
  type ConditionalFormat,
  type ConditionalFormatRule,
  type ModelableConditionalFormatRule,
  type ModelledConditionType,
} from "./ConditionalFormat";
import {
  isWholeSheetGridRange,
  type ProtectedRange,
  type ProtectedRangeContent,
  type ProtectionGridRange,
} from "./ProtectedRange";
import type {
  GridCellSnapshot,
  GridFetchOptions,
  GridFetchRange,
  GridRangeProps,
  LocalWriteOperation,
  RawSource,
  SheetConditionalFormatSnapshot,
  SheetProtectedRangeSnapshot,
  SheetSnapshot,
  SpreadsheetSnapshot,
  TableColumnSnapshot,
  TableSnapshot,
} from "./RawSource";
import {
  quantizeRgbChannels,
  type RgbChannels,
  type RgbColor,
} from "./RgbColor";

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

const sheetsApiBase = "https://sheets.googleapis.com/v4/spreadsheets";

const fieldMasks = {
  sheetProperties: "sheets(properties(sheetId,title),tables(tableId,range))",
  conditionalFormats: "sheets(properties(sheetId),conditionalFormats)",
  protectedRanges: "sheets(properties(sheetId),protectedRanges)",
  gridWithProgrammaticFacts:
    "sheets(" +
    "properties(sheetId,title)," +
    "tables(tableId,range,columnProperties(columnIndex,columnType,dataValidationRule(condition(type,values(userEnteredValue)))))," +
    "data(startColumn,startRow,columnMetadata,rowData(values(effectiveValue,userEnteredValue,effectiveFormat(numberFormat(type)),dataValidation(condition(type)))))" +
    ")",
  gridWithoutProgrammaticFacts:
    "sheets(" +
    "properties(sheetId,title)," +
    "tables(tableId,range)," +
    "data(startColumn,startRow,columnMetadata,rowData(values(effectiveValue)))" +
    ")",
} as const;

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
    get: (spreadsheetId: string, optionalArgs?: FieldsArg) => GoogleSpreadsheet;
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
        fields: fieldMasks.sheetProperties,
      }),
    );
  }
  fetchGrid(
    spreadsheetId: string,
    gridRanges: GridFetchRange[],
    options: GridFetchOptions,
  ): SpreadsheetSnapshot {
    return toSpreadsheetSnapshot(
      this.sheets.Spreadsheets.getByDataFilter(
        {
          dataFilters: gridRanges.map((gr) => ({ gridRange: gr })),
          includeGridData: true,
        },
        spreadsheetId,
        {
          fields: gridFields(options),
        },
      ),
    );
  }
  // getByDataFilter never returns conditionalFormats, so rules take a plain get.
  fetchConditionalFormatRules(
    spreadsheetId: string,
  ): SheetConditionalFormatSnapshot[] {
    const spreadsheet = this.sheets.Spreadsheets.get(spreadsheetId, {
      fields: fieldMasks.conditionalFormats,
    });
    return Val.assert(spreadsheet.sheets, "spreadsheet.sheets").map(
      (sheet) => ({
        sheetGid: Val.assert(sheet.properties?.sheetId, "sheetId"),
        // Google omits an empty list.
        rules: (sheet.conditionalFormats ?? []).map((rule, index) =>
          toConditionalFormatRule(rule, index),
        ),
      }),
    );
  }
  // Assumed to drop protectedRanges the same way until the probe says otherwise.
  fetchProtectedRanges(spreadsheetId: string): SheetProtectedRangeSnapshot[] {
    const spreadsheet = this.sheets.Spreadsheets.get(spreadsheetId, {
      fields: fieldMasks.protectedRanges,
    });
    return Val.assert(spreadsheet.sheets, "spreadsheet.sheets").map(
      (sheet) => ({
        sheetGid: Val.assert(sheet.properties?.sheetId, "sheetId"),
        protections: (sheet.protectedRanges ?? []).map(toProtectedRange),
      }),
    );
  }
  flush(spreadsheetId: string, operations: LocalWriteOperation[]): void {
    const requests = operations.flatMap(localOperationToGoogleRequests);
    if (requests.length === 0) return;
    const response = this.sheets.Spreadsheets.batchUpdate(
      { requests },
      spreadsheetId,
    );
    readAddProtectedRangeIds(response, requests);
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
    return `${sheetsApiBase}/${spreadsheetId}${suffix}${query}`;
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

function gridFields(options: GridFetchOptions): string {
  return options.includeProgrammaticFacts
    ? fieldMasks.gridWithProgrammaticFacts
    : fieldMasks.gridWithoutProgrammaticFacts;
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
        cells: Array.from(
          { length: (block.columnMetadata || []).length },
          (_, colOffset) => toGridCell(row.values?.[colOffset]),
        ),
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
      return formulaAndCellDataRequests(
        operation,
        {
          sheetId: operation.sheetId,
          rowIndex: operation.startRowIndex,
          columnIndex: operation.colIndex,
          rowCount: operation.endRowIndex - operation.startRowIndex,
        },
        (cell, fields) => ({
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
        }),
      );
    case "updateCell":
      return formulaAndCellDataRequests(
        operation,
        {
          sheetId: operation.sheetId,
          rowIndex: operation.rowIndex,
          columnIndex: operation.colIndex,
          rowCount: 1,
        },
        (cell, fields) => ({
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
        }),
      );
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
    case "addConditionalFormatRule":
      return [
        {
          addConditionalFormatRule: {
            index: operation.index,
            rule: modelableRuleToGoogle(operation.rule),
          },
        },
      ];
    case "deleteConditionalFormatRule":
      return [
        {
          deleteConditionalFormatRule: {
            sheetId: operation.sheetId,
            index: operation.index,
          },
        },
      ];
    case "addProtectedRange":
      return [
        {
          addProtectedRange: {
            protectedRange: protectedRangeContentToGoogle(operation.protection),
          },
        },
      ];
    case "deleteProtectedRange":
      return [
        {
          deleteProtectedRange: {
            protectedRangeId: operation.protectedRangeId,
          },
        },
      ];
    case "raw":
      return [operation.request as OpaqueRawRequest];
    default: {
      const exhaustive: never = operation;
      throw new Error(
        `Unknown local write operation: ${JSON.stringify(exhaustive)}`,
      );
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

function modelableRuleToGoogle(
  rule: ModelableConditionalFormatRule,
): GoogleAppsScript.Sheets.Schema.ConditionalFormatRule {
  return {
    ranges: rule.ranges,
    booleanRule: {
      condition: booleanConditionToGoogle(rule.condition),
      format: conditionalFormatToGoogle(rule.format),
    },
  };
}

function booleanConditionToGoogle(
  condition: BooleanCondition,
): GoogleAppsScript.Sheets.Schema.BooleanCondition {
  if (condition.type === "CUSTOM_FORMULA") {
    return {
      type: "CUSTOM_FORMULA",
      values: [{ userEnteredValue: condition.formula }],
    };
  }
  return {
    type: condition.type,
    values: [
      { userEnteredValue: cellValueToConditionLiteral(condition.value) },
    ],
  };
}

function cellValueToConditionLiteral(value: CellValue): string {
  if (value === true) return "TRUE";
  if (value === false) return "FALSE";
  return String(value);
}

function conditionLiteralToCellValue(text: string): CellValue {
  if (text === "TRUE") return true;
  if (text === "FALSE") return false;
  if (text !== "" && Number(text).toString() === text) return Number(text);
  return text;
}

function conditionalFormatToGoogle(
  format: ConditionalFormat,
): GoogleAppsScript.Sheets.Schema.CellFormat {
  return {
    ...(format.backgroundColor !== undefined
      ? { backgroundColor: rgbChannelsToGoogleColor(format.backgroundColor) }
      : {}),
    ...(format.foregroundColor !== undefined
      ? {
          textFormat: {
            foregroundColor: rgbChannelsToGoogleColor(format.foregroundColor),
          },
        }
      : {}),
  };
}

function rgbChannelsToGoogleColor(color: RgbChannels): GoogleColor {
  return {
    ...(color.red !== undefined ? { red: color.red } : {}),
    ...(color.green !== undefined ? { green: color.green } : {}),
    ...(color.blue !== undefined ? { blue: color.blue } : {}),
  };
}

function toConditionalFormatRule(
  rule: GoogleAppsScript.Sheets.Schema.ConditionalFormatRule,
  index: number,
): ConditionalFormatRule {
  const ranges = (rule.ranges ?? []).map(toGridRangeProps);
  const modelled = toModelableRule(rule, ranges);
  if (modelled === null) {
    return { kind: "unmodelable", ranges, index };
  }
  return modelled;
}

function toModelableRule(
  rule: GoogleAppsScript.Sheets.Schema.ConditionalFormatRule,
  ranges: GridRangeProps[],
): ModelableConditionalFormatRule | null {
  if (rule.gradientRule !== undefined) return null;
  const booleanRule = rule.booleanRule;
  if (booleanRule === undefined) return null;
  if (cellFormatHasUnmodelledFields(booleanRule.format)) return null;
  const type = booleanRule.condition?.type;
  if (type === undefined || !isModelledConditionType(type)) return null;
  const userEnteredValue = booleanRule.condition?.values?.[0]?.userEnteredValue;
  if (userEnteredValue === undefined) return null;
  const condition = toBooleanCondition(type, userEnteredValue);
  return {
    kind: "boolean",
    ranges,
    condition,
    format: quantizeConditionalFormat(toConditionalFormat(booleanRule.format)),
  };
}

function toBooleanCondition(
  type: ModelledConditionType,
  userEnteredValue: string,
): BooleanCondition {
  if (type === "CUSTOM_FORMULA") {
    return { type, formula: userEnteredValue };
  }
  return {
    type,
    value: conditionLiteralToCellValue(userEnteredValue),
  };
}

function toConditionalFormat(
  format: GoogleAppsScript.Sheets.Schema.CellFormat | undefined,
): ConditionalFormat {
  const backgroundColor = format?.backgroundColor;
  const foregroundColor = format?.textFormat?.foregroundColor;
  return {
    ...(backgroundColor !== undefined
      ? { backgroundColor: googleColorToRgbChannels(backgroundColor) }
      : {}),
    ...(foregroundColor !== undefined
      ? { foregroundColor: googleColorToRgbChannels(foregroundColor) }
      : {}),
  };
}

function googleColorToRgbChannels(color: GoogleColor): RgbChannels {
  return quantizeRgbChannels({
    ...(color.red !== undefined ? { red: color.red } : {}),
    ...(color.green !== undefined ? { green: color.green } : {}),
    ...(color.blue !== undefined ? { blue: color.blue } : {}),
  });
}

function cellFormatHasUnmodelledFields(
  format: GoogleAppsScript.Sheets.Schema.CellFormat | undefined,
): boolean {
  if (format === undefined) return false;
  if (
    objectHasDefinedKeysBesides(format, [
      "backgroundColor",
      "backgroundColorStyle",
      "textFormat",
    ]) ||
    !colorStyleMirrors(format.backgroundColorStyle, format.backgroundColor)
  ) {
    return true;
  }
  const textFormat = format.textFormat;
  if (textFormat === undefined) return false;
  return (
    objectHasDefinedKeysBesides(textFormat, [
      "foregroundColor",
      "foregroundColorStyle",
    ]) ||
    !colorStyleMirrors(
      textFormat.foregroundColorStyle,
      textFormat.foregroundColor,
    )
  );
}

// Google echoes each colour as a style; only an rgb copy of the plain colour is modelled.
function colorStyleMirrors(
  style: GoogleAppsScript.Sheets.Schema.ColorStyle | undefined,
  color: GoogleColor | undefined,
): boolean {
  if (style === undefined) return true;
  const rgb = style.rgbColor;
  if (style.themeColor !== undefined || rgb === undefined) return false;
  if (color === undefined) return false;
  return (["red", "green", "blue", "alpha"] as const).every(
    (channel) => (rgb[channel] ?? 0) === (color[channel] ?? 0),
  );
}

function objectHasDefinedKeysBesides(
  object: object,
  allowed: string[],
): boolean {
  return Object.entries(object).some(
    ([key, value]) => value !== undefined && !allowed.includes(key),
  );
}

function toGridRangeProps(
  range: GoogleAppsScript.Sheets.Schema.GridRange,
): GridRangeProps {
  // Google omits zero-valued fields, so a gid-0 sheet or column A arrives absent.
  return {
    sheetId: range.sheetId ?? 0,
    startRowIndex: range.startRowIndex ?? 0,
    ...(range.endRowIndex !== undefined
      ? { endRowIndex: range.endRowIndex }
      : {}),
    startColumnIndex: range.startColumnIndex ?? 0,
    ...(range.endColumnIndex !== undefined
      ? { endColumnIndex: range.endColumnIndex }
      : {}),
  };
}

function toProtectionGridRange(
  range: GoogleAppsScript.Sheets.Schema.GridRange,
): ProtectionGridRange {
  const hasBound =
    range.startRowIndex !== undefined ||
    range.endRowIndex !== undefined ||
    range.startColumnIndex !== undefined ||
    range.endColumnIndex !== undefined;
  if (!hasBound) {
    return { sheetId: range.sheetId ?? 0 };
  }
  return toGridRangeProps(range);
}

function protectionGridRangeToGoogle(
  range: ProtectionGridRange,
): GoogleAppsScript.Sheets.Schema.GridRange {
  if (isWholeSheetGridRange(range)) return { sheetId: range.sheetId };
  return range;
}

function protectedRangeContentToGoogle(
  protection: ProtectedRangeContent,
): GoogleAppsScript.Sheets.Schema.ProtectedRange {
  const editors =
    protection.kind === "lock" &&
    (protection.users.length > 0 || protection.groups.length > 0)
      ? {
          ...(protection.users.length > 0 ? { users: protection.users } : {}),
          ...(protection.groups.length > 0
            ? { groups: protection.groups }
            : {}),
        }
      : undefined;
  return {
    range: protectionGridRangeToGoogle(protection.range),
    ...(protection.description !== ""
      ? { description: protection.description }
      : {}),
    ...(protection.kind === "warning" ? { warningOnly: true } : {}),
    ...(protection.unprotectedRanges.length > 0
      ? {
          unprotectedRanges: protection.unprotectedRanges.map(
            protectionGridRangeToGoogle,
          ),
        }
      : {}),
    ...(editors !== undefined ? { editors } : {}),
  };
}

function toProtectedRange(
  protection: GoogleAppsScript.Sheets.Schema.ProtectedRange,
): ProtectedRange {
  const id = Val.assert(protection.protectedRangeId, "protectedRangeId");
  if (protection.namedRangeId !== undefined) {
    return { kind: "unmodelable", id };
  }
  if (protection.range === undefined) {
    return { kind: "unmodelable", id };
  }
  if (protection.editors?.domainUsersCanEdit === true) {
    return { kind: "unmodelable", id };
  }
  const isWarning = protection.warningOnly === true;
  // Google lists editors on a warning too, but a warning never uses them.
  const editors = isWarning ? undefined : protection.editors;
  return {
    kind: isWarning ? "warning" : "lock",
    id,
    range: toProtectionGridRange(protection.range),
    description: protection.description ?? "",
    users: editors?.users ?? [],
    groups: editors?.groups ?? [],
    unprotectedRanges: (protection.unprotectedRanges ?? []).map(
      toProtectionGridRange,
    ),
    requestingUserCanEdit: protection.requestingUserCanEdit ?? false,
  };
}

function readAddProtectedRangeIds(
  response: BatchUpdateResponse,
  requests: OpaqueRawRequest[],
): void {
  const replies = response.replies;
  if (replies === undefined) return;
  requests.forEach((request, index) => {
    if (request.addProtectedRange === undefined) return;
    const id =
      replies[index]?.addProtectedRange?.protectedRange?.protectedRangeId;
    if (id === undefined) {
      throw new Error(
        "Add protected range reply did not include a protectedRangeId.",
      );
    }
  });
}
