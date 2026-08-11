import type { SheetRaw } from "../SheetRaw";
import { SpreadsheetRaw } from "../SpreadsheetRaw";
import { SpecificSheetRawBase } from "./Base/SpecificSheetRawBase";
import { SpecificSheetRaw } from "./SpecificSheetRaw";

const columnConfigHeader = [
  "Sheet name",
  "Column name",
  "Column ID",
  "Column index base 0",
  "Is formula",
  "Value name",
  "Is api status and run",
] as const;

type ColumnConfigHeaders = (typeof columnConfigHeader)[number];

export class ColumnConfigRaw extends SpecificSheetRawBase<ColumnConfigHeaders> {
  get ss(): SpreadsheetRaw {
    return new SpreadsheetRaw(this.spreadsheetRawProps);
  }

  get sheet(): SheetRaw {
    return this.ss.sheet(this.sheetGid);
  }
  get sSheet(): SpecificSheetRaw<ColumnConfigHeaders> {
    return new SpecificSheetRaw<ColumnConfigHeaders>({
      headers: this.headers,
      ...this.sheetRawProps,
    });
  }
  addMissingColumnIds(): void {
    this.ss.fetchAllSheetsOneRow(this.ss.schema.colIdRowIdx);
    // I want all sheets one row and the tableSchema idPrefix column.
    let sheetUpdatedCount = 0;
    this.ss.activeSheets.forEach((sheet) => {
      sheet.addMissingColumnIds();
      sheetUpdatedCount++;
    });
    Logger.log(
      `ensureColumnIds: added missing column ID(s) in ${sheetUpdatedCount} sheets.`,
    );
  }
}
