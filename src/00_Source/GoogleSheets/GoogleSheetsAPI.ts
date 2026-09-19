import { Val } from "../../utils/Val";
import type {
  GridFetchOptions,
  GridFetchRange,
  LocalWriteOperation,
  RawSource,
  SheetConditionalFormatSnapshot,
  SheetEditProtectionSnapshot,
  SpreadsheetSnapshot,
} from "../RawSource/RawSource";
import { cellDataRequests } from "./GoogleSheetsAPI/cellData";
import { googleConditionalFormatRule } from "./GoogleSheetsAPI/conditionalFormats";
import { googleGrid } from "./GoogleSheetsAPI/gridSnapshots";
import { googleProtectedRange } from "./GoogleSheetsAPI/protectedRanges";

export type OpaqueRawRequest = GoogleAppsScript.Sheets.Schema.Request;

type GoogleSpreadsheet = GoogleAppsScript.Sheets.Schema.Spreadsheet;
type BatchUpdateRequest =
  GoogleAppsScript.Sheets.Schema.BatchUpdateSpreadsheetRequest;
type BatchUpdateResponse =
  GoogleAppsScript.Sheets.Schema.BatchUpdateSpreadsheetResponse;
type GetByDataFilterRequest =
  GoogleAppsScript.Sheets.Schema.GetSpreadsheetByDataFilterRequest;

interface FieldsArg {
  fields?: string;
}

const sheetsApiBase = "https://sheets.googleapis.com/v4/spreadsheets";

const fieldMasks = {
  sheetProperties:
    "sheets(properties(sheetId,title),tables(tableId,name,range))",
  conditionalFormats: "sheets(properties(sheetId),conditionalFormats)",
  protectedRanges: "sheets(properties(sheetId),protectedRanges)",
  gridWithProgrammaticFacts:
    "sheets(" +
    "properties(sheetId,title)," +
    "tables(tableId,name,range,columnProperties(columnIndex,columnName,columnType,dataValidationRule(condition(type,values(userEnteredValue)))))," +
    "data(startColumn,startRow,columnMetadata,rowData(values(effectiveValue,userEnteredValue,effectiveFormat(numberFormat(type)),dataValidation(condition(type)))))" +
    ")",
  gridWithoutProgrammaticFacts:
    "sheets(" +
    "properties(sheetId,title)," +
    "tables(tableId,name,range)," +
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
 * Google adapter for RawSource: with its GoogleSheetsAPI/ subfolder, the only
 * code that may construct or consume Google Sheets schema types or call
 * Spreadsheets.get / getByDataFilter / batchUpdate. SpreadsheetRaw holds a
 * RawSource. HTTP transport lives here so Node does not install a Sheets global.
 * Translation by subject: GoogleSheetsAPI/ cellData, conditionalFormats,
 * protectedRanges, gridSnapshots, googleColor.
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
    return googleGrid.toSpreadsheetSnapshot(
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
    return googleGrid.toSpreadsheetSnapshot(
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
          googleConditionalFormatRule.toConditionalFormatRule(rule, index),
        ),
      }),
    );
  }
  // Assumed to drop protectedRanges the same way until the probe says otherwise.
  fetchEditProtections(spreadsheetId: string): SheetEditProtectionSnapshot[] {
    const spreadsheet = this.sheets.Spreadsheets.get(spreadsheetId, {
      fields: fieldMasks.protectedRanges,
    });
    return Val.assert(spreadsheet.sheets, "spreadsheet.sheets").map(
      (sheet) => ({
        sheetGid: Val.assert(sheet.properties?.sheetId, "sheetId"),
        protections: (sheet.protectedRanges ?? []).map(
          googleProtectedRange.toEditProtection,
        ),
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
    googleProtectedRange.validateAddReplies(response, requests);
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

function gridFields(options: GridFetchOptions): string {
  return options.includeProgrammaticFacts
    ? fieldMasks.gridWithProgrammaticFacts
    : fieldMasks.gridWithoutProgrammaticFacts;
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
      return cellDataRequests.fill(operation);
    case "updateCell":
      return cellDataRequests.updateCell(operation);
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
            rule: googleConditionalFormatRule.fromModelable(operation.rule),
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
            protectedRange: googleProtectedRange.fromContent(
              operation.protection,
            ),
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
    case "updateSheetTitle":
      return [
        {
          updateSheetProperties: {
            properties: {
              sheetId: operation.sheetId,
              title: operation.title,
            },
            fields: "title",
          },
        },
      ];
    case "updateTableName":
      return [
        {
          updateTable: {
            table: {
              tableId: operation.tableId,
              name: operation.name,
            },
            fields: "name",
          },
        },
      ];
    case "updateTableColumnProperties":
      return [
        {
          updateTable: {
            table: {
              tableId: operation.tableId,
              columnProperties: operation.columnProperties,
            },
            fields: "columnProperties",
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
