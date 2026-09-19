import { columnConfigs } from "../01_SpreadsheetSchema/generated/columnConfigs";
import { sheetConfigs } from "../01_SpreadsheetSchema/generated/sheetConfigs";
import {
  buildGridRows,
  stubSheetsService,
  type FakeCell,
} from "./fakeSheetsService";

/**
 * A fake "Sheet Config" sheet, for tests about behaviour that reads or writes
 * a whole row rather than one named cell — clearing, the blank test, the wipe,
 * append reuse. Sheet Config earns the job by being the smallest real sheet.
 *
 * The column ids are the real committed ones, and the default columnId row
 * lists every column the config declares so clear / blank / wipe resolve each.
 */
const sheetConfigColumns = columnConfigs.sheetConfig;

export const sheetConfigGid = sheetConfigs.sheetConfig.sheetGid;

export const sheetConfigColumnIdRow = [
  sheetConfigColumns.sheetGid.columnId,
  sheetConfigColumns.sheetTitle.columnId,
  sheetConfigColumns.letApiAccess.columnId,
];

/** Every non-formula column filled in. */
export const filledSheetConfigRow: FakeCell[] = [999001, "Property", true];

/** The blank row: nothing in any non-formula column. */
export const blankSheetConfigRow: FakeCell[] = [null, null, null];

/**
 * Stubs the Sheets service with just this sheet, its data rows keyed by
 * literal sheet row index (4 is the top data row). Pass `rowsWithNoGridData`
 * to make a row come back with no cell data, which is what a row nothing was
 * ever written to looks like.
 */
export function stubSheetConfigSheet(
  dataRows: Record<number, FakeCell[]>,
  rowsWithNoGridData: number[] = [],
) {
  const rowIndexes = Object.keys(dataRows).map(Number);
  return stubSheetsService({
    sheets: [
      {
        sheetId: sheetConfigGid,
        title: "Sheet Config",
        rows: buildGridRows({ 0: sheetConfigColumnIdRow, ...dataRows }),
        rowsWithNoGridData,
        table: { endRowIndex: Math.max(...rowIndexes) + 1 },
      },
    ],
  });
}
