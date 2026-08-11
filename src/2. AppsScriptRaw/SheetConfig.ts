import { Str } from "../utils/Str";
import { type SheetRawProps } from "./ClassBases/SheetRawBase";
import type { ColumnRaw } from "./ColumnRaw";
import type { SheetRaw } from "./SheetRaw";
import { SpecificSheetRawBase } from "./SpecificSheetRaw/Base/SpecificSheetRawBase";
import { SpecificSheetRaw } from "./SpecificSheetRaw/SpecificSheetRaw";
import { SpreadsheetRaw } from "./SpreadsheetRaw";

const sheetConfigHeader = ["Sheet GID", "Sheet name", "Has ID column"] as const;

type SheetConfigHeaders = (typeof sheetConfigHeader)[number];

export class SheetConfig extends SpecificSheetRawBase<SheetConfigHeaders> {
  constructor({ ...rest }: SheetRawProps) {
    super({ headers: sheetConfigHeader, ...rest });
  }
  get ss(): SpreadsheetRaw {
    return new SpreadsheetRaw(this.spreadsheetRawProps);
  }
  get sheet(): SheetRaw {
    return this.ss.sheet(this.sheetGid);
  }
  get sSheet(): SpecificSheetRaw<SheetConfigHeaders> {
    return new SpecificSheetRaw<SheetConfigHeaders>({
      headers: this.headers,
      ...this.sheetRawProps,
    });
  }
  fetchGidColumn(): ColumnRaw {
    return this.sSheet.fetchColumnOfHeader("Sheet GID");
  }
  deleteStaleSheetConfigs() {
    const { activeSheetGids } = this.ss.fetchAllSheetProperties();
    const gidCol = this.fetchGidColumn();
    this.sheet.dataRows.forEach((row) => {
      const configGid = row.value(gidCol.colIndex) as number;
      if (!activeSheetGids.has(configGid)) {
        row.delete();
      }
    });
  }
  appendMissingSheetConfigs() {
    const { activeSheetGids } = this.ss.fetchAllSheetProperties();
    const gidCol = this.fetchGidColumn();
    gidCol.dataValueArr.forEach((gid) => {
      if (!activeSheetGids.has(gid as number)) {
        this.sheet.appendRowAndValues(new Map([[gidCol.colIndex, gid]]));
      }
    });
  }
  updateProgrammaticSheetConfigValues() {
    const columns = this.sSheet.fetchColumnsOfHeaders(
      "Sheet GID",
      "Sheet name",
      "Has ID column",
    );

    const gidCol = columns["Sheet GID"];
    const hasIdColCol = columns["Has ID column"];
    const sheetNameColIndex = columns["Sheet name camel case"].colIndex;

    gidCol.dataValueArr.forEach((gid) => {
      const sheet = this.ss.sheet(gid as number);
      sheet.gatherPropertiesGetRequest();
      sheet.gatherOneRowGetRequest(this.ss.schema.headerRowIdx);
    });
    this.ss.fetchSheets();

    let updatedValues = 0;
    this.sheet.dataRows.forEach((row) => {
      const sheetGid = row.value(gidCol.colIndex) as number;
      const sheet = this.ss.sheet(sheetGid);

      const sheetName = row.value(sheetNameColIndex);
      const actualSheetName = Str.sentenceToCamelCase(sheet.title);
      if (sheetName !== actualSheetName) {
        row.setValue(sheetNameColIndex, actualSheetName);
        updatedValues++;
      }

      const hasIdCol = row.value(hasIdColCol.colIndex);
      const actualHasIdCol = sheet.headerRow.activeValueArr.includes("ID");
      if (hasIdCol !== actualHasIdCol) {
        row.setValue(hasIdColCol.colIndex, actualHasIdCol);
        updatedValues++;
      }
    });
    Logger.log(`Corrected ${updatedValues} inaccurate Sheet Config cells.`);
  }
  maintainSheetConfigs() {
    this.deleteStaleSheetConfigs();
    this.appendMissingSheetConfigs();
    this.updateProgrammaticSheetConfigValues();
  }
  updateCodeBasedOnSpreadsheet() {
    // TODO
  }
}
