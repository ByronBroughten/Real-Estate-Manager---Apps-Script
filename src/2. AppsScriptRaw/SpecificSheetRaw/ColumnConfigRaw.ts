import { configGet } from "../../1.0 Configs/1. spreadsheetConfig";
import type { SpreadsheetRawProps } from "../ClassBases/SpreadsheetRawBase";
import type { SheetRaw } from "../SheetRaw";
import { SpreadsheetRaw } from "../SpreadsheetRaw";
import { SpecificSheetRawBase } from "./Base/SpecificSheetRawBase";
import { SheetConfigRaw } from "./SheetConfigRaw";
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
  constructor({ ...rest }: SpreadsheetRawProps) {
    super({
      headers: columnConfigHeader,
      sheetGid: configGet("columnConfigGid"),
      ...rest,
    });
  }
  get sheetConfig(): SheetConfigRaw {
    return new SheetConfigRaw(this.spreadsheetRawProps);
  }
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
    this.ss.ensureAllSheetPropertiesAreFetched();
    this.ss.prepFetchFullUniformRowsAllActiveSheets("columnId");
    this.sheetConfig.sSheet.fetchPrerequisitesForColumns();
    this.sheetConfig.sSheet.prepFetchDataColumnsOfFetchedHeaders(
      "Sheet GID",
      "Make schema for API",
      "ID prefix",
    );
    this.ss.fetchAll();

    const gidCol = this.sheetConfig.column("Sheet GID", "number");
    const makeSchemacol = this.sheetConfig.column("Make schema for API");
    const idPrefixCol = this.sheetConfig.column("ID prefix");

    this.sheetConfig.sheet.dataRows.forEach((row) => {
      const sheetGid = row.value(gidCol.colIndex, "number");
      const makeSchema = row.value(makeSchemacol.colIndex, "boolean");
      if (makeSchema) {
        const sheet = this.ss.sheet(sheetGid);
        sheet.addMissingColumnIds();
      }
    });

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
