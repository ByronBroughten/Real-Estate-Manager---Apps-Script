import type { SheetName } from "../0. spreadsheetMetaData/4.0 tableAttributes.js";
import type { ColumnName } from "../0. spreadsheetMetaData/5. allColumnAttributes.js";
import { SpreadsheetSchema } from "../1. SpreadsheetSchema/SpreadsheetSchemaNamed.js";
import { SpreadsheetRaw } from "../2. AppsScriptRaw/SpreadsheetRaw.js";
import type { FetchRowsRawProps } from "../2. AppsScriptRaw/Types/RawState.js";
import { Obj } from "../utils/Obj.js";
import { SpreadsheetNamedBase } from "./ClassBases/SpreadsheetNamedBase.js";
import { SheetNamed } from "./SheetNamed.js";
import {
  isRowSpecifierBySchemaName,
  type ColumnSpecifierNamed,
  type FetchRowsNamedProps,
  type NamedSheets,
  type RowSpecifierName,
} from "./Types/NamedState.js";

export class SpreadsheetNamed extends SpreadsheetNamedBase {
  static init(): SpreadsheetNamed {
    return new SpreadsheetNamed(
      SpreadsheetNamedBase.initSpreadsheetNamedProps(),
    );
  }
  get raw(): SpreadsheetRaw {
    return new SpreadsheetRaw(this.spreadsheetRawProps);
  }
  get schema(): SpreadsheetSchema {
    return this.spreadsheetSchema;
  }
  get activeSheetNames(): SheetName[] {
    return Obj.keys(this.namedState.sheetRowIdsToIndexes);
  }
  sheet<TN extends SheetName>(sheetName: TN): SheetNamed<TN> {
    return new SheetNamed({
      sheetName,
      ...this.spreadsheetNamedProps,
    });
  }
  sheets<TN extends SheetName>(...sheetNames: TN[]): NamedSheets<TN> {
    return sheetNames.reduce((acc, sheetName) => {
      acc[sheetName] = this.sheet(sheetName);
      return acc;
    }, {} as NamedSheets<TN>);
  }
  fetchRows<T extends SheetName>(
    ...props: FetchRowsNamedProps<T>[]
  ): NamedSheets<T> {
    this._reqSheetsPropsArrToRaw(props);
    this.raw.fetchRows(...this.fetchRowsRawProps);
    this.namedState.fetchRowsRawProps = [];

    const sheetNames = this._tableNamesFromReqProps(props);
    return this.sheets(...sheetNames);
  }
  private _reqSheetsPropsArrToRaw(
    propsArr: FetchRowsNamedProps<SheetName>[],
  ): SpreadsheetNamed {
    propsArr.forEach((props) => this._reqSheetsPropsToRaw(props));
    return this;
  }
  private _reqSheetsPropsToRaw({
    rowSpecifier,
    sheetColumns,
  }: FetchRowsNamedProps) {
    const arrSpecifier =
      typeof rowSpecifier === "string" ? [rowSpecifier] : rowSpecifier;
    arrSpecifier.forEach((specifier) => {
      this._rowSpecifierNameToRaw(specifier, sheetColumns);
    });
  }
  private _rowSpecifierNameToRaw(
    rowSpecifier: RowSpecifierName,
    sheetColumns: FetchRowsNamedProps["sheetColumns"],
  ): void {
    const rawSheets = this._namedToRawSheetColumnSpecifiers(sheetColumns);
    const schema = this.schema;
    if (rowSpecifier === "activeRows") {
      for (const sheetId of rawSheets.keys()) {
        this.raw.sheet(sheetId).activeRowIndexes.forEach((rowIdx) => {
          this.fetchRowsRawProps.push({
            startRowIndex: rowIdx,
            rowCount: 1,
            sheetColumns: new Map([[sheetId, rawSheets.get(sheetId)]]),
          });
        });
      }
    } else if (isRowSpecifierBySchemaName(rowSpecifier)) {
      this.fetchRowsRawProps.push({
        ...schema.rawRowSpecifierByName(rowSpecifier),
        sheetColumns: rawSheets,
      });
    } else {
      throw new Error(
        `Invalid rowSpecifier: ${rowSpecifier}. Must be a valid RowSpecifierName.`,
      );
    }
  }
  private _namedToRawSheetColumnSpecifiers(
    sheetColumns: FetchRowsNamedProps["sheetColumns"],
  ): FetchRowsRawProps["sheetColumns"] {
    return Obj.keys(sheetColumns).reduce(
      (acc, sheetName) => {
        const sheetGid = this.schema.sheet(sheetName).sheetGid;
        const columnSpecifier = this._columnSpecifierToIndexes(
          sheetColumns[sheetName],
          sheetName,
        );
        acc.set(sheetGid, columnSpecifier);
        return acc;
      },
      new Map() as FetchRowsRawProps["sheetColumns"],
    );
  }
  private _columnSpecifierToIndexes<TN extends SheetName>(
    columnSpecifier: ColumnSpecifierNamed<TN>,
    sheetName: TN,
  ): number[] {
    const schema = this.schema.sheet(sheetName);
    if (columnSpecifier === "allColumns") {
      return [...schema.raw.allColumnIdxes];
    } else if (typeof columnSpecifier === "string") {
      return [schema.column(columnSpecifier).idxBase0];
    } else {
      return (["id", ...(columnSpecifier as ColumnName[])] as const).map(
        (colName) => this.schema.column(sheetName, colName).idxBase0,
      );
    }
  }
  private _tableNamesFromReqProps<T extends SheetName>(
    propsArr: FetchRowsNamedProps<T>[],
  ): Set<T> {
    return propsArr.reduce((sheetNames, props) => {
      return sheetNames.add(...Obj.keys(props.sheetColumns));
    }, new Set() as Set<T>);
  }
  addMissingColumnIds() {
    this.fetchRows({
      rowSpecifier: "columnIds",
      sheetColumns: this.schema.specifyAllSheetsAndColumns(),
    });
    let sheetsUpdated = 0;
    this.activeSheets().forEach((sheet) => {
      sheet.addMissingColumnIds();
      sheetsUpdated++;
    });
    Logger.log(
      `ensureColumnIds: added missing column ID(s) in ${sheetsUpdated} sheets.`,
    );
  }
  activeSheets(): SheetNamed<SheetName>[] {
    return this.activeSheetNames.map((sheetName) => this.sheet(sheetName));
  }
  ensureIdColumnOnAllTables() {
    this.fetchRows({
      rowSpecifier: "headers",
      sheetColumns: this.schema.specifyAllSheetsAndColumns(),
    });

    const sheetsWithoutIdColumn = this.activeSheets().filter((sheet) => {
      return sheet.headerRow.raw.activeValueArr.includes("ID") === false;
    });

    let fixedCount = 0;
    for (const sheet of sheetsWithoutIdColumn) {
      sheet.raw.insertColumnAt(0);
      sheet.raw.headerRow.setValue(0, "ID");
      for (const row of sheet.raw.activeRows) {
        const newId = sheet.schema.makeRowId();
        row.setValue(0, newId);
      }
      fixedCount++;
    }
    Logger.log(`Added an "ID" header column to ${fixedCount} table(s).`);
  }
}
