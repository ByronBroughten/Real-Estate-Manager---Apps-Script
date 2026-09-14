import type { CellValue } from "../00_base/base";
import {
  getColumnTraitByName,
  type ColumnName,
} from "../01_generatedConfigs/columnConfigsTypes";
import { makeImportLine } from "../01_generatedConfigs/makeConfigs";
import type { LiveSpreadsheetConfig } from "../01_generatedConfigs/spreadsheetConfigTypes";
import type { SpreadsheetNamedProps } from "../04_SpreadsheetNamed/ClassBases/SpreadsheetNamedBase";
import type { SpreadsheetNamedState } from "../04_SpreadsheetNamed/Types/NamedState";
import { spreadsheetConfigFileSource } from "./configFileSource";
import { GenericSheetOperator } from "./GenericSheetOperator";

type SpreadsheetConfigColumnName = ColumnName<"spreadsheetConfig">;

const guaranteedColumns: readonly SpreadsheetConfigColumnName[] = [
  "idDelimiter",
  "nameDelimiter",
  "idHeader",
  "startTableColumnIndexBase1",
  "columnIdRowIndexBase1",
  "columnGroupHeadingRowIndexBase1",
  "actionRowIndexBase1",
  "headerRowIndexBase1",
  "topBodyRowIndexBase5",
];

export class SpreadsheetConfigOperator extends GenericSheetOperator<"spreadsheetConfig"> {
  constructor(props: SpreadsheetNamedProps) {
    super({
      sheetName: "spreadsheetConfig",
      ...props,
    });
  }
  static init(): SpreadsheetConfigOperator {
    return new SpreadsheetConfigOperator(
      SpreadsheetConfigOperator.initSpreadsheetNamedProps(),
    );
  }
  get spreadsheetConfigSync(): SpreadsheetNamedState["spreadsheetConfigSync"] {
    return this.namedState.spreadsheetConfigSync;
  }
  fetchLiveConfig(): LiveSpreadsheetConfig {
    this.ss.raw.fetchSheetUsedGrid(this.schema.sheetGid);
    const liveConfig = this._translateFetchedGrid();
    this.spreadsheetConfigSync.liveConfig = liveConfig;
    return liveConfig;
  }
  toFileSource(): string {
    const liveConfig = this.spreadsheetConfigSync.liveConfig;
    if (liveConfig === null) {
      throw new Error(
        "SpreadsheetConfigOperator has not yet fetched the live Spreadsheet Config.",
      );
    }
    return [
      `${makeImportLine("makeSpreadsheetConfig")}`,
      ``,
      `export const spreadsheetConfig = makeSpreadsheetConfig(${spreadsheetConfigFileSource(
        liveConfig,
      )} as const);`,
      ``,
    ].join("\n");
  }
  private _translateFetchedGrid(): LiveSpreadsheetConfig {
    const guaranteedHeaders = guaranteedColumns.map((columnName) =>
      this._header(columnName),
    );
    const headerRowIndex = this._uniqueHeaderRowIndex(guaranteedHeaders);
    const colIndexByHeader = this._colIndexByHeader(
      headerRowIndex,
      guaranteedHeaders,
    );
    const dataRowIndex = this._uniqueDataRowIndex(
      headerRowIndex,
      colIndexByHeader,
    );
    return {
      idDelimiter: this._stringCell(
        dataRowIndex,
        colIndexByHeader,
        "idDelimiter",
      ),
      nameDelimiter: this._stringCell(
        dataRowIndex,
        colIndexByHeader,
        "nameDelimiter",
      ),
      idHeader: this._stringCell(dataRowIndex, colIndexByHeader, "idHeader"),
      startTableColIndexBase0: this._indexCell(
        dataRowIndex,
        colIndexByHeader,
        "startTableColumnIndexBase1",
      ),
      columnIdRowIdxBase0: this._indexCell(
        dataRowIndex,
        colIndexByHeader,
        "columnIdRowIndexBase1",
      ),
      columnGroupHeadingRowIndexBase0: this._indexCell(
        dataRowIndex,
        colIndexByHeader,
        "columnGroupHeadingRowIndexBase1",
      ),
      actionRowIndexBase0: this._indexCell(
        dataRowIndex,
        colIndexByHeader,
        "actionRowIndexBase1",
      ),
      headerRowIndexBase0: this._indexCell(
        dataRowIndex,
        colIndexByHeader,
        "headerRowIndexBase1",
      ),
      topDataRowIdxBase0: this._indexCell(
        dataRowIndex,
        colIndexByHeader,
        "topBodyRowIndexBase5",
      ),
    };
  }
  private _uniqueHeaderRowIndex(guaranteedHeaders: string[]): number {
    const matchingRowIndexes = this.sheet.raw.activeRowIndexes.filter(
      (rowIndex) =>
        guaranteedHeaders.every((header) =>
          this._rowValues(rowIndex).includes(header),
        ),
    );
    if (matchingRowIndexes.length !== 1) {
      throw new Error(
        `Spreadsheet Config header row must be the unique row that contains every guaranteed header; found ${matchingRowIndexes.length}.`,
      );
    }
    return matchingRowIndexes[0]!;
  }
  private _rowValues(rowIndex: number): CellValue[] {
    const rowState = this.sheet.raw.rowStates.get(rowIndex);
    return rowState ? [...rowState.values()] : [];
  }
  private _colIndexByHeader(
    headerRowIndex: number,
    guaranteedHeaders: string[],
  ): Map<string, number> {
    const colIndexByHeader = new Map<string, number>();
    const rowState = this.sheet.raw.rowStates.get(headerRowIndex);
    if (!rowState) {
      throw new Error("Spreadsheet Config header row is not active.");
    }
    for (const [colIndex, value] of rowState.entries()) {
      if (typeof value === "string" && guaranteedHeaders.includes(value)) {
        colIndexByHeader.set(value, colIndex);
      }
    }
    return colIndexByHeader;
  }
  private _uniqueDataRowIndex(
    headerRowIndex: number,
    colIndexByHeader: Map<string, number>,
  ): number {
    const guaranteedColIndexes = [...colIndexByHeader.values()];
    const dataRowIndexes = this.sheet.raw.activeRowIndexes.filter(
      (rowIndex) => {
        if (rowIndex <= headerRowIndex) return false;
        return guaranteedColIndexes.some((colIndex) => {
          return this._cellValueOrEmpty(rowIndex, colIndex) !== "";
        });
      },
    );
    if (dataRowIndexes.length !== 1) {
      throw new Error(
        `Spreadsheet Config must have exactly one data row below the header; found ${dataRowIndexes.length}.`,
      );
    }
    return dataRowIndexes[0]!;
  }
  private _stringCell(
    dataRowIndex: number,
    colIndexByHeader: Map<string, number>,
    columnName: SpreadsheetConfigColumnName,
  ): string {
    const header = this._header(columnName);
    const value = this._nonBlankCell(dataRowIndex, colIndexByHeader, header);
    if (typeof value !== "string") {
      throw new Error(
        `Spreadsheet Config column "${header}" must be text, got ${JSON.stringify(value)}.`,
      );
    }
    return value;
  }
  private _indexCell(
    dataRowIndex: number,
    colIndexByHeader: Map<string, number>,
    columnName: SpreadsheetConfigColumnName,
  ): number {
    const header = this._header(columnName);
    const value = this._nonBlankCell(dataRowIndex, colIndexByHeader, header);
    if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
      throw new Error(
        `Spreadsheet Config column "${header}" must be an integer ≥ 1, got ${JSON.stringify(value)}.`,
      );
    }
    return value - 1;
  }
  private _nonBlankCell(
    dataRowIndex: number,
    colIndexByHeader: Map<string, number>,
    header: string,
  ): CellValue {
    const colIndex = colIndexByHeader.get(header);
    if (colIndex === undefined) {
      throw new Error(
        `Spreadsheet Config is missing guaranteed column "${header}".`,
      );
    }
    const value = this._cellValueOrEmpty(dataRowIndex, colIndex);
    if (value === "") {
      throw new Error(`Spreadsheet Config column "${header}" is blank.`);
    }
    return value;
  }
  private _header(columnName: SpreadsheetConfigColumnName): string {
    return getColumnTraitByName("spreadsheetConfig", columnName, "header");
  }
  private _cellValueOrEmpty(
    rowIndex: number,
    colIndex: number,
  ): CellValue | "" {
    const rowState = this.sheet.raw.rowStates.get(rowIndex);
    if (!rowState || !rowState.has(colIndex)) {
      return "";
    }
    return rowState.get(colIndex) ?? "";
  }
}
