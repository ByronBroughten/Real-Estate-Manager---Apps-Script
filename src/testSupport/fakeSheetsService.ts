import { vi } from "vitest";

type BatchUpdateRequest =
  GoogleAppsScript.Sheets.Schema.BatchUpdateSpreadsheetRequest;
type BatchUpdateResponse =
  GoogleAppsScript.Sheets.Schema.BatchUpdateSpreadsheetResponse;
type GoogleCellData = GoogleAppsScript.Sheets.Schema.CellData;

/** A single cell's value, in the same terms `CellRaw` reads/writes them.
 * `null` (or a short row) represents an empty cell. */
export type FakeCellValue = string | number | boolean | null;

/**
 * A cell's value plus the live facts `ColumnConfigOperator
 * .fetchAndUpdateColumnConfig` reads off it (`CellRaw.isFormula`/
 * `numberFormatType`) — use this richer form instead of a bare
 * `FakeCellValue` wherever a test needs to mark a cell as a live formula or
 * give it a number format (e.g. `DATE`) distinguishable from a plain number.
 */
export interface FakeRichCellValue {
  value: FakeCellValue;
  isFormula?: boolean;
  numberFormatType?: string;
}
export type FakeCell = FakeCellValue | FakeRichCellValue;

export interface FakeSheetProperties {
  sheetId: number;
  title: string;
  /**
   * Row-major grid data, starting at row/column 0 — row indexes here are
   * literal sheet row indexes, so they must line up with
   * `spreadsheetConfig`'s row layout (row 0 is the columnId row, row 4 is
   * the first data row, etc.) for anything above 02_SpreadsheetRaw to
   * resolve columns/values correctly. Omit for a sheet whose cell content
   * doesn't matter to the test (sheet-properties-only fixtures still work
   * as before).
   */
  rows?: readonly (readonly FakeCell[])[];
  /**
   * The sheet's Table range. Required for any test that reads/appends
   * *data* rows on this sheet (`DataSheetRaw`'s `rowIndexesActive`/
   * `appendDataRow` etc. read `activeTable`, which throws if no table was
   * ever integrated) — not needed for sheets only read via a uniform row
   * (e.g. a business sheet's header row). `endRowIndex` is the exclusive
   * bound of existing data rows; appending a row increments it in place,
   * matching production (`DataRowRaw.append`).
   */
  table?: {
    endRowIndex: number;
    /**
     * A column's live data-validation condition values (e.g.
     * `["=valueConfig[Transaction Description]"]`), keyed by absolute
     * column index — read by `ColumnConfigOperator`'s valueName detection
     * (`SheetRaw.columnValidationValues`). Omit for a table with no
     * validated columns.
     */
    columnValidationValues?: Record<number, string[]>;
  };
}

export interface FakeSheetsServiceOptions {
  sheets?: FakeSheetProperties[];
}

export interface FakeSheetsService {
  /** Every request object passed to `Sheets.Spreadsheets.batchUpdate`, in call order. */
  batchUpdateCalls: BatchUpdateRequest[];
}

/**
 * Builds a `FakeSheetProperties["rows"]` array from a sparse `{ rowIndex:
 * cells }` map, padding the gaps with empty rows so array position lines
 * up with literal sheet row index (row 0 is the columnId row, row 4 is
 * the first data row, per `spreadsheetConfig` — see `rows`' own doc).
 */
export function buildGridRows(
  rowsByIndex: Record<number, readonly FakeCell[]>,
): FakeCell[][] {
  const maxRowIndex = Math.max(0, ...Object.keys(rowsByIndex).map(Number));
  return Array.from(
    { length: maxRowIndex + 1 },
    (_, rowIndex) => [...(rowsByIndex[rowIndex] ?? [])],
  );
}

function fakeCellToGoogleCellData(cell: FakeCell): GoogleCellData {
  if (cell === null) {
    return {};
  }
  const rich: FakeRichCellValue = typeof cell === "object" ? cell : { value: cell };
  const data: GoogleCellData = {
    effectiveValue: fakeValueToExtendedValue(rich.value),
  };
  if (rich.isFormula) {
    data.userEnteredValue = { formulaValue: "=FAKE_FORMULA()" };
  }
  if (rich.numberFormatType) {
    data.effectiveFormat = {
      numberFormat: { type: rich.numberFormatType },
    };
  }
  return data;
}

function fakeValueToExtendedValue(
  value: FakeCellValue,
): GoogleAppsScript.Sheets.Schema.ExtendedValue | undefined {
  if (value === null) {
    return undefined;
  }
  if (typeof value === "string") {
    return { stringValue: value };
  }
  if (typeof value === "number") {
    return { numberValue: value };
  }
  return { boolValue: value };
}

function fakeRowsToGoogleSheetData(
  rows: FakeSheetProperties["rows"],
): GoogleAppsScript.Sheets.Schema.Sheet["data"] | undefined {
  if (!rows) {
    return undefined;
  }
  const columnCount = Math.max(0, ...rows.map((row) => row.length));
  return [
    {
      startColumn: 0,
      startRow: 0,
      columnMetadata: Array.from({ length: columnCount }, () => ({})),
      rowData: rows.map((row) => ({
        values: Array.from(
          { length: columnCount },
          (_, colIndex): GoogleCellData =>
            fakeCellToGoogleCellData(row[colIndex] ?? null),
        ),
      })),
    },
  ];
}

/**
 * Stubs the `Sheets` Advanced Service global.
 *
 * Covers the read path (`Spreadsheets.get`/`getByDataFilter`, backed by the
 * `sheets` fixture, including each sheet's `rows` grid data when given)
 * faithfully — real requested dataFilters/gridRanges are ignored and the
 * fixture's full grid is always returned, which is harmless here since
 * `SpreadsheetRaw` only ever integrates whatever grid data comes back, and
 * over-returning can't produce incorrect state. `batchUpdate` is a spy
 * only — it records the exact requests SpreadsheetRaw sends but does not
 * (yet) replay them onto the fixture, since the Sheets request grammar
 * (appendCells/updateCells/insertDimension/sortRange/...) is large. Extend
 * this fake's `batchUpdate` handling as tests come to need particular
 * request kinds applied back.
 */
export function stubSheetsService(
  options: FakeSheetsServiceOptions = {},
): FakeSheetsService {
  const sheets = options.sheets ?? [];
  const batchUpdateCalls: BatchUpdateRequest[] = [];

  function sheetsResponse(): GoogleAppsScript.Sheets.Schema.Spreadsheet {
    return {
      sheets: sheets.map(
        (s): GoogleAppsScript.Sheets.Schema.Sheet => ({
          properties: { sheetId: s.sheetId, title: s.title },
          data: fakeRowsToGoogleSheetData(s.rows),
          tables: s.table
            ? [
                {
                  tableId: `fake-table-${s.sheetId}`,
                  range: {
                    startRowIndex: 0,
                    endRowIndex: s.table.endRowIndex,
                    startColumnIndex: 0,
                    endColumnIndex: Math.max(
                      0,
                      ...(s.rows ?? []).map((row) => row.length),
                    ),
                  },
                  columnProperties: s.table.columnValidationValues
                    ? Object.entries(s.table.columnValidationValues).map(
                        ([colIndex, values]) => ({
                          columnIndex: Number(colIndex),
                          dataValidationRule: {
                            condition: {
                              values: values.map((userEnteredValue) => ({
                                userEnteredValue,
                              })),
                            },
                          },
                        }),
                      )
                    : undefined,
                },
              ]
            : undefined,
        }),
      ),
    };
  }

  const service = {
    Spreadsheets: {
      get: (_spreadsheetId: string, _params?: object) => sheetsResponse(),
      getByDataFilter: (
        _resource: object,
        _spreadsheetId: string,
        _params?: object,
      ) => sheetsResponse(),
      batchUpdate: (
        resource: BatchUpdateRequest,
        _spreadsheetId: string,
      ): BatchUpdateResponse => {
        batchUpdateCalls.push(resource);
        return {};
      },
    },
  };

  vi.stubGlobal("Sheets", service);

  return { batchUpdateCalls };
}
