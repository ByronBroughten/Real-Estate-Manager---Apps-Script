import {
  makeStructuredConfig,
  type CellValueName,
} from "../../1.0 Configs/0.0 ConfigPrecursors";
import { configGet } from "../../1.0 Configs/1. spreadsheetConfig";
import { SchemaBase } from "../../1.1 SpreadsheetSchemaRaw/SchemaBase";
import { Obj } from "../../utils/Obj";
import type { SpreadsheetRawProps } from "../ClassBases/SpreadsheetRawBase";
import type { ColumnRaw } from "../ColumnRaw";
import type { SheetRaw } from "../SheetRaw";
import { SpreadsheetRaw } from "../SpreadsheetRaw";
import { SpecificSheetRawBase } from "./Base/SpecificSheetRawBase";
import { SpecificSheetRaw } from "./SpecificSheetRaw";

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

export class SheetConfigRaw extends SpecificSheetRawBase<SheetConfigHeader> {
  constructor({ ...rest }: SpreadsheetRawProps) {
    super({
      headers: sheetConfigHeaders,
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
  get sSheet(): SpecificSheetRaw<SheetConfigHeader> {
    return new SpecificSheetRaw<SheetConfigHeader>({
      headers: this.headers,
      ...this.sheetRawProps,
    });
  }
  column<HD extends SheetConfigHeader>(
    header: HD,
  ): ColumnRaw<HeaderToValueName[HD]> {
    return this.sheet.columnByHeader(
      header,
      headerToValueName[header],
    ) as ColumnRaw<HeaderToValueName[HD]>;
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
    this.sheet.dataRows.forEach((row) => {
      const sheetGid = row.value(gidCol.colIndex) as number;
      const sheet = this.ss.sheet(sheetGid);
      const sheetName = row.value(sheetNameCol.colIndex);
      const actualSheetName = this.schema.sheetNameFromTitle(sheet.title);
      if (sheetName !== actualSheetName) {
        row.updateValue(sheetNameCol.colIndex, actualSheetName);
        updatedValues++;
      }
      const hasIdCol = row.value(hasColForIdCol.colIndex);
      const actualHasIdCol = sheet.headerRow.hasValue("ID");
      if (hasIdCol !== actualHasIdCol) {
        row.updateValue(hasColForIdCol.colIndex, actualHasIdCol);
        updatedValues++;
      }
    });
    return updatedValues;
  }
  updateCodeBasedOnSpreadsheet() {
    // TODO
  }
}
