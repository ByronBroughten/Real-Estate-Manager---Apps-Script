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

    const gidCol = this.sheetConfig.column("Sheet GID");
    const makeSchemaCol = this.sheetConfig.column("Make schema for API");
    const idPrefixCol = this.sheetConfig.column("ID prefix");

    let idsAdded = 0;
    this.sheetConfig.sheet.dataRows.forEach((row) => {
      const sheetGid = gidCol.dataValue(row.rowIndex);
      const makeSchema = makeSchemaCol.dataValue(row.rowIndex);
      const idPrefix = idPrefixCol.dataValue(row.rowIndex);

      if (makeSchema) {
        if (typeof idPrefix !== "string" || !idPrefix) {
          throw new Error(
            `SheetConfigRaw: Sheet GID ${sheetGid} has "Make schema for API" true but no valid "ID prefix" value.`,
          );
        }
        const sheet = this.ss.sheet(sheetGid);
        idsAdded += sheet.addMissingColumnIds(idPrefix);
      }
    });
    Logger.log(
      `ensureColumnIds: prepared to add ${idsAdded} missing column ID(s)`,
    );
  }
}
