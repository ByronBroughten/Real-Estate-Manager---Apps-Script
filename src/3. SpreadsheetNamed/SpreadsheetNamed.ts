import type { SheetName } from "../1.0 Configs/2.0 sheetConfigs.js";
import { SpreadsheetRaw } from "../2. AppsScriptRaw/SpreadsheetRaw.js";
import type { SheetColumnsRange } from "../2. AppsScriptRaw/Types/RawState.js";
import { SpreadsheetSchema } from "../2.0 Schemas/SpreadsheetSchemaNamed.js";
import { Obj } from "../utils/Obj.js";
import { SpreadsheetNamedBase } from "./ClassBases/SpreadsheetNamedBase.js";
import { SheetNamed } from "./SheetNamed.js";
import {
  isRowSpecifierBySchemaName,
  type FetchColumnSpecifierNamed,
  type FetchPropsNamed,
  type FetchPropsStandardNamed,
  type NamedSheets,
  type RowSpecifierName,
  type SheetColumnNamesStandard,
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
    return [...this.raw.activeSheetGids].map(
      (sheetGid) => this.schema.raw.sheet(sheetGid).sheetName,
    );
  }
  sheet<TN extends SheetName>(sheetName: TN): SheetNamed<TN> {
    return new SheetNamed({
      sheetName,
      ...this.spreadsheetNamedProps,
    });
  }
  namedSheets<TN extends SheetName>(...sheetNames: TN[]): NamedSheets<TN> {
    return sheetNames.reduce((acc, sheetName) => {
      acc[sheetName] = this.sheet(sheetName);
      return acc;
    }, {} as NamedSheets<TN>);
  }
  get activeSheets(): SheetNamed<SheetName>[] {
    return this.activeSheetNames.map((sheetName) => this.sheet(sheetName));
  }
  fetch<SN extends SheetName>(
    ...props: FetchPropsNamed<SN>[]
  ): NamedSheets<SN> {
    const standardizedProps = this._standardizeProps(props);
    this._reqSheetsPropsArrToRaw(standardizedProps);
    this.raw.fetchSheets(...this.gridRangeFetchProps);
    this.namedState.gridRangeFetchProps = [];
    const sheetNames = this._sheetNamesFromReqProps(standardizedProps);
    return this.namedSheets(...sheetNames);
  }
  private _standardizeProps<SN extends SheetName>(
    propsArr: FetchPropsNamed<SN>[],
  ): FetchPropsStandardNamed<SN>[] {
    return propsArr.map((props) => {
      const { rowSpecifier } = props;
      const columnSpecifiers = this._standardizeColumnSpecifiers(props);
      return {
        rowSpecifier,
        sheetColumnNames: columnSpecifiers,
      };
    });
  }

  private _standardizeColumnSpecifiers<SN extends SheetName>(
    columnSpecifier: FetchColumnSpecifierNamed<SN>,
  ): SheetColumnNamesStandard<SN> {
    if (columnSpecifier.sheetColumnMode === "all") {
      return this.schema.specifyAllSheetsAndColumns();
    } else if (columnSpecifier.sheetColumnMode === "allColumns") {
      const sheetNames = Array.isArray(columnSpecifier.sheetNames)
        ? columnSpecifier.sheetNames
        : [columnSpecifier.sheetNames];
      return sheetNames.reduce((acc, sheetName) => {
        acc[sheetName] = this.schema.sheet(sheetName).columnNames;
        return acc;
      }, {} as SheetColumnNamesStandard<SN>);
    } else if (columnSpecifier.sheetColumnMode === "specific") {
      const sheetColumnNames = columnSpecifier.sheetColumnNames;
      return Obj.keys(sheetColumnNames).reduce((acc, sheetName) => {
        const schema = this.schema.sheet(sheetName);
        acc[sheetName] = schema.columnSpecifierToStandard(
          sheetColumnNames[sheetName],
        );
        return acc;
      }, {} as SheetColumnNamesStandard<SN>);
    }
  }

  private _reqSheetsPropsArrToRaw(
    propsArr: FetchPropsStandardNamed<SheetName>[],
  ): SpreadsheetNamed {
    propsArr.forEach((props) => this._reqSheetsPropsToRaw(props));
    return this;
  }
  private _reqSheetsPropsToRaw({
    rowSpecifier,
    sheetColumnNames,
  }: FetchPropsStandardNamed) {
    const arrSpecifier =
      typeof rowSpecifier === "string" ? [rowSpecifier] : rowSpecifier;
    arrSpecifier.forEach((specifier) => {
      this._rowSpecifierNameToRaw(specifier, sheetColumnNames);
    });
  }
  private _rowSpecifierNameToRaw(
    rowSpecifier: RowSpecifierName,
    sheetColumnNames: FetchPropsStandardNamed["sheetColumnNames"],
  ): void {
    const columnSheetGrids =
      this._namedToRawSheetColumnSpecifiers(sheetColumnNames);
    const schema = this.schema;
    columnSheetGrids.forEach((columnSheetGrid) => {
      if (rowSpecifier === "activeRows") {
        const sheet = this.raw.sheet(columnSheetGrid.sheetId);
        sheet.activeRowIndexes.forEach((rowIdx) => {
          this.gridRangeFetchProps.push({
            ...columnSheetGrid,
            startRowIndex: rowIdx,
            endRowIndex: rowIdx + 1,
          });
        });
      } else if (isRowSpecifierBySchemaName(rowSpecifier)) {
        this.gridRangeFetchProps.push({
          ...schema.rawRowSpecifierByName(rowSpecifier),
          ...columnSheetGrid,
        });
      } else {
        throw new Error(
          `Invalid rowSpecifier: ${rowSpecifier}. Must be a valid RowSpecifierName.`,
        );
      }
    });
  }
  private _namedToRawSheetColumnSpecifiers(
    sheetColumns: FetchPropsStandardNamed["sheetColumnNames"],
  ): SheetColumnsRange[] {
    return Obj.keys(sheetColumns).reduce((acc, sheetName) => {
      const schema = this.schema.sheet(sheetName);
      const columnNames = sheetColumns[sheetName];
      columnNames.forEach((columnName) => {
        const colIndex = schema.colIndex(columnName);
        acc.push({
          sheetId: schema.sheetGid,
          startColumnIndex: colIndex,
          endColumnIndex: colIndex + 1,
        });
      });
      return acc;
    }, [] as SheetColumnsRange[]);
  }
  private _sheetNamesFromReqProps<T extends SheetName>(
    propsArr: FetchPropsStandardNamed<T>[],
  ): Set<T> {
    return propsArr.reduce((sheetNames, props) => {
      return sheetNames.add(...Obj.keys(props.sheetColumnNames));
    }, new Set() as Set<T>);
  }
  fillMissingRowIds() {
    // maybe change this stuff to not raw
    this.raw.fetchAllSheetsOneRow(this.schema.headerRowIdx);
    this.activeSheets.forEach((sheet) => {
      const headers = sheet.raw.headerRow.activeValueArr;
      if (headers.includes("ID") === false) {
        throw new Error(
          `Cannot fill missing row IDs in sheet "${sheet.raw.sheetGid}" because it does not have an "ID" column.`,
        );
      }
      const idColIdx = headers.indexOf("ID");
      const idCol = sheet.rich.column(idColIdx);
      idCol.dataCellsToDefault();
    });
  }
  convenience() {
    // Update these so that they only work with sheets that have ID prefixes defined.
    this.fillMissingRowIds();
  }

  // I need to do something about adding data rows when fetching sheets from the named layer.
  // That's to ensure I get the columnIds (add those specific columns and rows) and table properties (add one row 4:4 per sheet).

  // Named layer only worries about data rows, yeah?

  // Should different row classes be on the named layer or raw layer?
  // I want them only on the name layer, but I might not even need them there.
  // I can possibly just handle them on the raw layer.

  // HeaderRow, GroupNameRow, DataRow, ActionRow, ColumnIdRow
  // GroupNameRow and HeaderRow could each be unimplemented and throw errors on operations
  // They each contain RawRow
  // They are each based on DataRowNamed
}
