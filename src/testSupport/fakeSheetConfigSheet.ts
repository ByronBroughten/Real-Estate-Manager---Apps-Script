import { columnConfigs } from "../01_generatedConfigs/columnConfigs";
import { sheetConfigs } from "../01_generatedConfigs/sheetConfigs";
import {
  buildGridRows,
  stubSheetsService,
  type FakeCell,
} from "./fakeSheetsService";

/**
 * A fake "Sheet Config" sheet, for tests about behaviour that reads or writes
 * a whole row rather than one named cell — clearing, the blank test, the wipe,
 * append reuse. Sheet Config earns the job by being the smallest real sheet
 * that has both non-formula columns and a formula column
 * (`idPrefixIsUniqueOrEmpty`), so a test can assert that a formula cell was
 * left alone without asserting over thirty columns.
 *
 * The column ids are the real committed ones, and the columnId row lists every
 * column the config declares — anything reading a row by its configured
 * columns resolves each against this row, so a partial one would throw.
 */
const sheetConfigColumns = columnConfigs.sheetConfig;

export const SHEET_CONFIG_GID = sheetConfigs.sheetConfig.sheetGid;
export const SHEET_CONFIG_FORMULA_COLUMN_ID =
  sheetConfigColumns.idPrefixIsUniqueOrEmpty.columnId;

export const sheetConfigColumnIdRow = [
  sheetConfigColumns.sheetGid.columnId,
  sheetConfigColumns.sheetTitle.columnId,
  sheetConfigColumns.hasIdColumn.columnId,
  sheetConfigColumns.letApiAccess.columnId,
  sheetConfigColumns.idPrefix.columnId,
  SHEET_CONFIG_FORMULA_COLUMN_ID,
];

/** Every non-formula column filled in; the formula column shows its result. */
export const filledSheetConfigRow: FakeCell[] = [
  999001,
  "Property",
  false,
  true,
  "prp",
  true,
];

/** The blank row: nothing in any non-formula column, formula cell still live. */
export const blankSheetConfigRow: FakeCell[] = [
  null,
  null,
  null,
  null,
  null,
  true,
];

/**
 * Stubs the Sheets service with just this sheet, its data rows keyed by
 * literal sheet row index (4 is the top data row). Pass `rowsWithNoGridData`
 * to make a row come back absent, which is what a row nothing ever fetched
 * looks like.
 */
export function stubSheetConfigSheet(
  dataRows: Record<number, FakeCell[]>,
  rowsWithNoGridData: number[] = [],
) {
  const rowIndexes = Object.keys(dataRows).map(Number);
  return stubSheetsService({
    sheets: [
      {
        sheetId: SHEET_CONFIG_GID,
        title: "Sheet Config",
        rows: buildGridRows({ 0: sheetConfigColumnIdRow, ...dataRows }),
        rowsWithNoGridData,
        table: { endRowIndex: Math.max(...rowIndexes) + 1 },
      },
    ],
  });
}
