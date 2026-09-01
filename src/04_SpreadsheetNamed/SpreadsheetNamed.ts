import type { SheetName } from "../01_generatedConfigs/sheetConfigsTypes.js";
import { SpreadsheetRaw } from "../02_SpreadsheetRaw/SpreadsheetRaw.js";
import type { GatherDataPrerequisitesProps } from "../03_SpreadsheetIndexed/SheetIndexed";
import type { SheetIndexed } from "../03_SpreadsheetIndexed/SheetIndexed.js";
import { SpreadsheetIndexed } from "../03_SpreadsheetIndexed/SpreadsheetIndexed.js";
import { Obj } from "../utils/Obj.js";
import { Val } from "../utils/Val.js";
import { SpreadsheetNamedBase } from "./ClassBases/SpreadsheetNamedBase.js";
import { SheetNamed } from "./SheetNamed.js";
import type { SheetNameByGroup } from "./SheetNameGroups.js";
import { SpreadsheetSchemaNamed } from "./SpreadsheetSchemaNamed.js";
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
    return new SpreadsheetNamed(SpreadsheetNamed.initSpreadsheetNamedProps());
  }
  get raw(): SpreadsheetRaw {
    return new SpreadsheetRaw(this.spreadsheetRawProps);
  }
  get indexed(): SpreadsheetIndexed {
    return new SpreadsheetIndexed(this.spreadsheetIndexedProps);
  }
  get schema(): SpreadsheetSchemaNamed {
    return this.ssSchema;
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
  get activeSheetNames(): SheetName[] {
    return this.indexed.activeSheets.map((sheet) => sheet.sheetName);
  }
  get activeSheets(): SheetNamed<SheetName>[] {
    return this.activeSheetNames.map((sheetName) => this.sheet(sheetName));
  }
  fetchAllPrepped(props: GatherDataPrerequisitesProps = {}): SpreadsheetNamed {
    this.indexed.fetchAllPrepped(props);
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
          Val.assert<ColumnSpecifierNamed<SN>>(
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
      const columnNames = Val.assert(
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
    const column = sheet.column(columnId).data;
    switch (rowSpecifier) {
      case "activeRows":
      case "data":
        column.prepFetchFull();
        break;
      case "topDatum":
        column.cell(schema.topDataRowIdx).prepFetch();
        break;
      case "actions":
        column.cell(schema.actionRowIndex).prepFetch();
        break;
      case "columnIds":
        column.cell(schema.colIdRowIndex).prepFetch();
        break;
      case "headers":
        column.cell(schema.headerRowIndex).prepFetch();
        break;
      case "all":
        column.cell(schema.headerRowIndex).prepFetch();
        column.cell(schema.actionRowIndex).prepFetch();
        column.cell(schema.colIdRowIndex).prepFetch();
        column.prepFetchFull();
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
  discardQueuedChanges(): this {
    this.raw.discardQueuedChanges();
    return this;
  }
  fetchAllSheetProperties(): this {
    this.raw.fetchAllSheetProperties();
    return this;
  }
  ensureAllSheetPropertiesAreFetched(): this {
    this.raw.ensureAllSheetPropertiesAreFetched();
    return this;
  }
  fillMissingRowIds() {
    // could potentially be reconfigured to not rely on the schema.
    const idSheets = this._sheetsWithRowIds();
    idSheets.forEach((sheet) => {
      sheet.column("id").data.prepFetchFull();
    });
    this.fetchAllPrepped();
    idSheets.forEach((sheet) => {
      sheet.column("id").data.emptyDataCellsToDefault();
    });
  }
  private _sheetsWithRowIds(): SheetNamed<SheetNameByGroup<"hasIdColumn">>[] {
    return this.sheetsOfSchema.filter((sheet) => {
      const hasIdCol = sheet.schema.trait("hasIdColumn");
      const idPrefix = sheet.schema.trait("idPrefix");
      if (hasIdCol) {
        if (!idPrefix) {
          throw new Error(
            `Cannot fill missing row IDs in sheet "${sheet}" because it does not have an "ID prefix" defined in the schema.`,
          );
        }
        return true;
      }
      return false;
    }) as SheetNamed<SheetNameByGroup<"hasIdColumn">>[];
  }
}
