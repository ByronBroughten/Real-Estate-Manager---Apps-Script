import { makeStructuredConfig, type CellValueName } from "../00_base/base";
import { baseSheetsTraits } from "../00_base/baseSheetTraits";
import { type SheetTraitsBase } from "../00_base/makeSheetsTraits";
import { configGet } from "../00_base/spreadsheetConfig";
import { SchemaBase } from "../03_SpreadsheetIndexed/SchemaBase";
import { Arr } from "../utils/Arr";
import { Obj } from "../utils/Obj";
import { SpecificSheetRawBase } from "./ClassBases/SpecificSheetRawBase";
import type { SpreadsheetRawProps } from "./ClassBases/SpreadsheetRawBase";
import type { SheetRaw } from "./SheetRaw";
import { SpecificSheetRaw } from "./SpecificSheetRaw";
import { SpreadsheetRaw } from "./SpreadsheetRaw";

const headerToValueNameAuto = makeStructuredConfig(
  {} as Record<string, CellValueName>,
  {
    "Sheet GID": "number",
    "Sheet title": "string",
    "Has ID column": "boolean",
  } as const,
);
const headerToValueNameUser = makeStructuredConfig(
  {} as Record<string, CellValueName>,
  {
    "Let api access traits": "boolean" as CellValueName,
    "ID prefix": "string" as CellValueName,
  } as const,
);
const headerToValueName = {
  ...headerToValueNameAuto,
  ...headerToValueNameUser,
} as const;

const programmaticConfigHeaders = Obj.keys(headerToValueNameAuto);
const userConfigHeaders = Obj.keys(headerToValueNameUser);
const sheetConfigHeaders = Obj.keys(headerToValueName);

type HeaderToValueName = typeof headerToValueName;
type SheetConfigHeader = (typeof sheetConfigHeaders)[number];

export class SheetConfigRaw extends SpecificSheetRawBase<HeaderToValueName> {
  constructor({ ...rest }: SpreadsheetRawProps) {
    super({
      headerToValueName: headerToValueName,
      sheetGid: configGet("sheetConfigGid"),
      ...rest,
    });
  }
  get ss(): SpreadsheetRaw {
    return new SpreadsheetRaw(this.spreadsheetRawProps);
  }
  get schema(): SchemaBase {
    return new SchemaBase();
  }
  get sheet(): SheetRaw {
    return this.ss.sheet(this.sheetGid);
  }
  get sSheet(): SpecificSheetRaw<HeaderToValueName> {
    return new SpecificSheetRaw({
      headerToValueName: this.headerToValueName,
      ...this.sheetRawProps,
    });
  }
  fetchAndUpdateAll() {
    this._fetchAllPreppedneededForUpdate();
    this._ensureHeaders();
    this._deleteStaleSheetConfigs();
    this._appendMissingSheetConfigs();
    this._updateProgrammaticValues();
  }
  private _fetchAllPreppedneededForUpdate() {
    this.ss.fetchAllPreppedSheetProperties();
    this.sheet.fetchHeaderRowUsingSheetProperties();
    const gidCol = this.column("Sheet GID").fetchDataCellsUsingHeaders();
    gidCol.dataValueArr.forEach((gid) => {
      const sheet = this.ss.sheet(gid);
      sheet.prepFetchHeaderRowUsingSheetProperties();
    });
    this.sheet.prepFetchDataColumnsUsingHeaders(
      ...Arr.excludeStrict(sheetConfigHeaders, "Sheet GID"),
    );
    this.ss.fetchAllPrepped();
  }
  private _ensureHeaders() {
    const numFixed = this.sheet.ensureColumnsOfHeadersExist(...this.headers);
    if (numFixed > 0) {
      Logger.log(
        `Added ${numFixed} missing header(s) to the "Sheet Config" sheet.`,
      );
    }
  }
  private _deleteStaleSheetConfigs() {
    const gidCol = this.column("Sheet GID");
    this.sheet.dataRows.forEach((row) => {
      const configGid = row.value(gidCol.colIndex) as number;
      if (!this.ss.activeSheetGids.has(configGid)) {
        row.delete();
      }
    });
  }
  private _appendMissingSheetConfigs() {
    const { activeSheetGids } = this.ss;
    const gidCol = this.column("Sheet GID");
    gidCol.dataValueArr.forEach((gid) => {
      if (!activeSheetGids.has(gid as number)) {
        this.sheet.appendDataRowValues(new Map([[gidCol.colIndex, gid]]));
      }
    });
  }
  private _updateProgrammaticValues(): void {
    const gidCol = this.column("Sheet GID");
    const sheetTitleCol = this.column("Sheet title");
    const hasColForIdCol = this.column("Has ID column");
    let updatedValues = 0;
    this.sheet.dataRowIndexes.forEach((rowIndex) => {
      const sheetGid = gidCol.dataValue(rowIndex);
      const sheetTitle = sheetTitleCol.dataValue(rowIndex);

      const activeSheet = this.ss.sheet(sheetGid);
      if (sheetTitle !== activeSheet.title) {
        sheetTitleCol.updateDataCell(rowIndex, activeSheet.title);
        updatedValues++;
      }
      const hasIdCol = hasColForIdCol.dataValue(rowIndex);
      const actualHasIdCol = activeSheet.headerRow.hasValue("ID");
      if (hasIdCol !== actualHasIdCol) {
        hasColForIdCol.updateDataCell(rowIndex, actualHasIdCol);
        updatedValues++;
      }
    });
    Logger.log(`Corrected ${updatedValues} inaccurate Sheet Config cells.`);
  }
  generateSheetTraitsFileSource(): string {
    this.sheet.prepFetchProperties();
    this.sheet.prepFetchUniformRowUsingSheetProperties("header");
    this.ss.fetchAllPrepped();
    this.sheet.prepFetchDataColumnsUsingHeaders(
      "Sheet name",
      "ID prefix",
      "Has ID column",
    );
    this.ss.fetchAllPrepped();

    const gidCol = this.column("Sheet GID");
    const titleCol = this.column("Sheet title");
    const prefixCol = this.column("ID prefix");
    const hasIdCol = this.column("Has ID column");

    const entries: SheetTraitsBase = {};
    this.sheet.dataRowIndexes.forEach((rowIndex) => {
      const title = titleCol.dataValue(rowIndex);
      const sheetName = this.schema.sheetNameFromTitle(title);
      entries[sheetName] = {
        sheetGid: Number(gidCol.dataValue(rowIndex)),
        idPrefix: String(prefixCol.dataValue(rowIndex)),
        hasIdColumn: Boolean(hasIdCol.dataValue(rowIndex)),
      };
    });

    const allSheetTraits: SheetTraitsBase = {
      ...baseSheetsTraits,
      ...entries,
    };

    return [
      `import { makeSheetsTraits } from "../00_base/makeSheetsTraits";`,
      ``,
      `export const allSheetTraits = makeSheetsTraits(${JSON.stringify(
        allSheetTraits,
        null,
        2,
      )});`,
      ``,
    ].join("\n");
  }
}
