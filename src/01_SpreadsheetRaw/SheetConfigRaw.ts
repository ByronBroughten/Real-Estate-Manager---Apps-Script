import { makeStructuredConfig, type CellValueName } from "../00_base/base";
import { configGet } from "../00_base/spreadsheetConfig";
import { SchemaBase } from "../03_SpreadsheetIndexed/SchemaBase";
import { Obj } from "../utils/Obj";
import { SpecificSheetRawBase } from "./ClassBases/SpecificSheetRawBase";
import type { SpreadsheetRawProps } from "./ClassBases/SpreadsheetRawBase";
import type { ColumnRaw } from "./ColumnRaw";
import type { SheetRaw } from "./SheetRaw";
import { SpecificSheetRaw } from "./SpecificSheetRaw";
import { SpreadsheetRaw } from "./SpreadsheetRaw";

const headerToValueNameAuto = makeStructuredConfig(
  {} as Record<string, CellValueName>,
  {
    "Sheet GID": "number",
    "Sheet name": "string",
    "Has ID column": "boolean",
  } as const,
);
const headerToValueNameUser = makeStructuredConfig(
  {} as Record<string, CellValueName>,
  {
    "Make schema for API": "boolean" as CellValueName,
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
      headerToValueName,
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
  fetchHeadersAndColumn<H extends SheetConfigHeader>(header: H): ColumnRaw {
    // At this level, headers are needed before the column can be fetched.
    this.sheet.fetchUniformRow("header");
    return this.sSheet.fetchDataColumnOfFetchedHeader(header);
  }
  maintainSheetConfigs() {
    this.ensureHeaders();
    this.deleteStaleSheetConfigs();
    this.appendMissingSheetConfigs();
    this.updateProgrammaticSheetConfigValues();
  }
  private ensureHeaders() {
    const numFixed = this.sheet.ensureColumnsOfHeadersExist(...this.headers);
    if (numFixed > 0) {
      Logger.log(
        `Added ${numFixed} missing header(s) to the "Sheet Config" sheet.`,
      );
    }
  }
  deleteStaleSheetConfigs() {
    const { activeSheetGids } = this.ss.fetchAllSheetProperties();
    this.sheet.fetchUniformRow("header");
    this.column("Sheet GID").prepFetchAllDataCells().ss.fetchAll();

    const gidCol = this.fetchHeadersAndColumn("Sheet GID");
    this.sheet.dataRows.forEach((row) => {
      const configGid = row.value(gidCol.colIndex) as number;
      if (!activeSheetGids.has(configGid)) {
        row.delete();
      }
    });
  }
  appendMissingSheetConfigs() {
    const { activeSheetGids } = this.ss.fetchAllSheetProperties();
    const gidCol = this.fetchHeadersAndColumn("Sheet GID");
    gidCol.dataValueArr.forEach((gid) => {
      if (!activeSheetGids.has(gid as number)) {
        this.sheet.appendDataRowValues(new Map([[gidCol.colIndex, gid]]));
      }
    });
  }
  updateProgrammaticSheetConfigValues() {
    this.sheet.prepFetchProperties();
    this.sheet.prepFetchFullUniformRow("header");
    this.ss.fetchAll();

    this.sheet.prepFetchDataColumnsOfFetchedHeaders(
      ...programmaticConfigHeaders,
    );
    this.ss.fetchAll();

    this._fetchSheetHeadersInGidColumn();
    const updatedValues = this._updateConfigSheetNamesAndHasIdCol();
    Logger.log(`Corrected ${updatedValues} inaccurate Sheet Config cells.`);
  }
  private _fetchSheetHeadersInGidColumn() {
    const gidCol = this.column("Sheet GID");
    gidCol.dataValueArr.forEach((gid) => {
      if (gid === this.sheetGid) {
        return;
      }
      const sheet = this.ss.sheet(gid as number);
      sheet.prepFetchProperties();
      sheet.prepFetchFullUniformRow("header");
    });
    this.ss.fetchAll();
  }
  private _updateConfigSheetNamesAndHasIdCol(): number {
    const gidCol = this.column("Sheet GID");
    const sheetNameCol = this.column("Sheet name");
    const hasColForIdCol = this.column("Has ID column");
    let updatedValues = 0;
    this.sheet.dataRowIndexes.forEach((rowIndex) => {
      const sheetGid = gidCol.dataValue(rowIndex);
      const sheetName = sheetNameCol.dataValue(rowIndex);

      const sheet = this.ss.sheet(sheetGid);

      const actualSheetName = this.schema.sheetNameFromTitle(sheet.title);
      if (sheetName !== actualSheetName) {
        sheetNameCol.updateDataCell(rowIndex, actualSheetName);
        updatedValues++;
      }
      const hasIdCol = hasColForIdCol.dataValue(rowIndex);
      const actualHasIdCol = sheet.headerRow.hasValue("ID");
      if (hasIdCol !== actualHasIdCol) {
        hasColForIdCol.updateDataCell(rowIndex, actualHasIdCol);
        updatedValues++;
      }
    });
    return updatedValues;
  }
  generateSheetTraitsFileSource(): string {
    this.sheet.prepFetchProperties();
    this.sheet.prepFetchFullUniformRow("header");
    this.ss.fetchAll();
    this.sheet.prepFetchDataColumnsOfFetchedHeaders(
      "Sheet name",
      "ID prefix",
      "Has ID column",
    );
    this.ss.fetchAll();

    const gidCol = this.column("Sheet GID");
    const nameCol = this.column("Sheet name");
    const prefixCol = this.column("ID prefix");
    const hasIdCol = this.column("Has ID column");

    const entries = this.sheet.dataRowIndexes.map((rowIndex) => {
      const args = [
        String(gidCol.dataValue(rowIndex)),
        JSON.stringify(prefixCol.dataValue(rowIndex)),
      ];
      if (hasIdCol.dataValue(rowIndex)) {
        args.push("true");
      }
      return `  ${nameCol.dataValue(rowIndex)}: msc(${args.join(", ")}),`;
    });

    return [
      `import { makeStructuredConfig } from "../00_base/base";`,
      `import { makeAllSheetTraits, type AllSheetTraitsBase } from "./02_sheetTraitsTypes";`,
      ``,
      `export const msc = makeAllSheetTraits;`,
      `export const allSheetTraits = makeStructuredConfig({} as AllSheetTraitsBase, {`,
      ...entries,
      `});`,
      ``,
    ].join("\n");
  }
}
