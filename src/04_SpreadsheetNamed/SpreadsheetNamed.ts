import type { SheetColumnsRange } from "../01_SpreadsheetRaw/ClassTypes/AccessorsRaw.js";
import { SpreadsheetRaw } from "../01_SpreadsheetRaw/SpreadsheetRaw.js";
import type { SheetName } from "../02_generatedTraits/02_sheetTraitsTypes.js";
import { SpreadsheetIndexed } from "../03_SpreadsheetIndexed/SpreadsheetIndexed.js";
import { Obj } from "../utils/Obj.js";
import { SpreadsheetNamedBase } from "./ClassBases/SpreadsheetNamedBase.js";
import { SheetNamed } from "./SheetNamed.js";
import type { SheetNameByGroup } from "./SheetNameGroups.js";
import { SpreadsheetSchema } from "./SpreadsheetSchemaNamed.js";
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
  get indexed(): SpreadsheetIndexed {
    return new SpreadsheetIndexed(this.spreadsheetRawProps);
  }
  get schema(): SpreadsheetSchema {
    return this.spreadsheetSchema;
  }
  sheet<TN extends SheetName>(sheetName: TN): SheetNamed<TN> {
    return new SheetNamed({
      sheetName,
      ...this.spreadsheetNamedProps,
    });
  }
  sheetByGid(sheetGid: number): SheetNamed {
    const { sheetName } = this.schema.sheetByGid(sheetGid);
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
  get activeSheetNames(): SheetName[] {
    return [...this.raw.activeSheetGids].map(
      (sheetGid) => this.indexed.sheet(sheetGid).sheetName,
    );
  }
  get activeSheets(): SheetNamed<SheetName>[] {
    return this.activeSheetNames.map((sheetName) => this.sheet(sheetName));
  }
  fetchAllPrepped(): SpreadsheetNamed {
    this.activeSheets.forEach((sheet) => {});
    this.raw.fetchAllPrepped();
    return this;
  }
  fetch<SN extends SheetName>(
    ...props: FetchPropsNamed<SN>[]
  ): NamedSheets<SN> {
    const standardizedProps = this._standardizeProps(props);
    this._namedPropArrToRaw(standardizedProps);
    this.fetchAllPrepped();
    this.namedState.gridRangeFetchProps = [];
    const sheetNames = this._sheetNamesFromReqProps(standardizedProps);
    return this.sheets(...sheetNames);
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

  private _namedPropArrToRaw(
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
  get sheetsOfSchema(): SheetNamed<SheetName>[] {
    return this.schema.sheetNames.map((sheetName) => this.sheet(sheetName));
  }
  batchUpdateGSheets(): void {
    this.raw.batchUpdateGSheets();
  }
  fillMissingRowIds() {
    const idSheets = this.sheetsOfSchema.filter((sheet) => {
      const hasIdCol = sheet.schema.trait("hasIdColumn");
      const idPrefix = sheet.schema.trait("idPrefix");
      if (hasIdCol) {
        if (!idPrefix) {
          throw new Error(
            `Cannot fill missing row IDs in sheet "${sheet}" because it does not have an "ID prefix" defined in the schema.`,
          );
        }
        return true;
      } else {
        return false;
      }
    }) as SheetNamed<SheetNameByGroup<"hasIdColumn">>[];
    idSheets.forEach((sheet) => {
      sheet.column("id").prepFetchAllDataCells();
      // column.prepFetchUniformCell("header")
    });
    this.fetchAllPrepped();
    idSheets.forEach((sheet) => {
      sheet.column("id").fillEmptyDataCellsWithDefaultValues();
    });
  }
}
