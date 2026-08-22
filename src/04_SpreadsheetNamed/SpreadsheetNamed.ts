import { SpreadsheetRaw } from "../01_SpreadsheetRaw/SpreadsheetRaw.js";
import type { SheetName } from "../02_generatedTraits/02_sheetTraitsTypes.js";
import type { SheetIndexed } from "../03_SpreadsheetIndexed/SheetIndexed.js";
import { SpreadsheetIndexed } from "../03_SpreadsheetIndexed/SpreadsheetIndexed.js";
import { Obj } from "../utils/Obj.js";
import { valS } from "../utils/validation.js";
import { SpreadsheetNamedBase } from "./ClassBases/SpreadsheetNamedBase.js";
import { SheetNamed } from "./SheetNamed.js";
import type { SheetNameByGroup } from "./SheetNameGroups.js";
import { SpreadsheetSchema } from "./SpreadsheetSchemaNamed.js";
import {
  type ColumnSpecifierNamed,
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
    return new SpreadsheetIndexed(this.spreadsheetIndexedProps);
  }
  get schema(): SpreadsheetSchema {
    return this.ssSchema;
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
    return this.indexed.activeSheets.map((sheet) => sheet.sheetName);
  }
  get activeSheets(): SheetNamed<SheetName>[] {
    return this.activeSheetNames.map((sheetName) => this.sheet(sheetName));
  }
  fetchAllPrepped(): SpreadsheetNamed {
    this.indexed.fetchAllPrepped();
    return this;
  }
  fetch<SN extends SheetName>(
    ...props: FetchPropsNamed<SN>[]
  ): NamedSheets<SN> {
    const standardizedProps = this._standardizeProps(props);
    this._prepFetchStandardizedProps(standardizedProps);
    this.fetchAllPrepped();
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
          valS.assert<ColumnSpecifierNamed<SN>>(
            sheetColumnNames[sheetName],
            `sheetColumnNames[${sheetName}]`,
          ),
        );
        return acc;
      }, {} as SheetColumnNamesStandard<SN>);
    } else {
      throw new Error(
        `Invalid sheetColumnMode: ${
          (columnSpecifier as FetchColumnSpecifierNamed<SN>).sheetColumnMode
        }. Must be a valid ColumnMode.`,
      );
    }
  }

  private _prepFetchStandardizedProps(
    propsArr: FetchPropsStandardNamed<SheetName>[],
  ): void {
    propsArr.forEach((props) => this._prepFetchStandardProps(props));
  }
  private _prepFetchStandardProps({
    rowSpecifier,
    sheetColumnNames,
  }: FetchPropsStandardNamed): void {
    const specifiers =
      typeof rowSpecifier === "string" ? [rowSpecifier] : rowSpecifier;
    Obj.keys(sheetColumnNames).forEach((sheetName) => {
      const columnNames = valS.assert(
        sheetColumnNames[sheetName],
        `sheetColumnNames[${sheetName}]`,
      );
      const namedSheet = this.sheet(sheetName);
      const indexedSheet = namedSheet.indexed;
      columnNames.forEach((columnName) => {
        const columnId = namedSheet.schema.column(columnName).columnId;
        specifiers.forEach((specifier) => {
          this._prepFetchRowSpecifier(indexedSheet, specifier, columnId);
        });
      });
    });
  }
  private _prepFetchRowSpecifier(
    sheet: SheetIndexed,
    rowSpecifier: RowSpecifierName,
    columnId: string,
  ): void {
    const schema = sheet.schema;
    switch (rowSpecifier) {
      case "activeRows":
      case "data":
        sheet.prepFetchFullDataColumn(columnId);
        break;
      case "topDatum":
        sheet.prepFetchSingleCell(schema.topDataRowIdx, columnId);
        break;
      case "actions":
        sheet.prepFetchSingleCell(schema.actionRowIndex, columnId);
        break;
      case "columnIds":
        sheet.prepFetchSingleCell(schema.colIdRowIndex, columnId);
        break;
      case "headers":
        sheet.prepFetchSingleCell(schema.headerRowIndex, columnId);
        break;
      case "all":
        sheet.prepFetchSingleCell(schema.headerRowIndex, columnId);
        sheet.prepFetchSingleCell(schema.actionRowIndex, columnId);
        sheet.prepFetchSingleCell(schema.colIdRowIndex, columnId);
        sheet.prepFetchFullDataColumn(columnId);
        break;
      default:
        throw new Error(
          `Invalid rowSpecifier: ${rowSpecifier as string}. Must be a valid RowSpecifierName.`,
        );
    }
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
      sheet.column("id").gatherFetchAllDataCells();
      // column.gatherFetchUniformCell("header")
    });
    this.fetchAllPrepped();
    idSheets.forEach((sheet) => {
      sheet.column("id").emptyDataCellsToDefault();
    });
  }
}
