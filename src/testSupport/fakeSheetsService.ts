import { vi } from "vitest";

type BatchUpdateRequest =
  GoogleAppsScript.Sheets.Schema.BatchUpdateSpreadsheetRequest;
type BatchUpdateResponse =
  GoogleAppsScript.Sheets.Schema.BatchUpdateSpreadsheetResponse;

export interface FakeSheetProperties {
  sheetId: number;
  title: string;
}

export interface FakeSheetsServiceOptions {
  sheets?: FakeSheetProperties[];
}

export interface FakeSheetsService {
  /** Every request object passed to `Sheets.Spreadsheets.batchUpdate`, in call order. */
  batchUpdateCalls: BatchUpdateRequest[];
}

/**
 * Stubs the `Sheets` Advanced Service global.
 *
 * Covers the read path (`Spreadsheets.get`/`getByDataFilter`, backed by the
 * `sheets` fixture) faithfully. `batchUpdate` is a spy only — it records the
 * exact requests SpreadsheetRaw sends but does not (yet) replay them onto
 * the fixture, since the Sheets request grammar (appendCells/updateCells/
 * insertDimension/sortRange/...) is large. Extend this fake's `batchUpdate`
 * handling as tests come to need particular request kinds applied back.
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
