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
  "tableHeaderRowIndexBase1",
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
  validateExactlyOneDataRow(): void {
    const dataRowCount = this.sheet.raw.dataRowCountAfterFlush;
    if (dataRowCount !== 1) {
      throw new Error(
        `Spreadsheet Config Table must have exactly one data row; found ${dataRowCount}.`,
      );
    }
  }
  private _translateFetchedGrid(): LiveSpreadsheetConfig {
    const guaranteedHeaders = guaranteedColumns.map((columnName) =>
      this._header(columnName),
    );
    const tableHeaderRowIndex = this._uniqueTableHeaderRowIndex(
      guaranteedHeaders,
    );
    const colIndexByHeader = this._colIndexByHeader(
      tableHeaderRowIndex,
      guaranteedHeaders,
    );
    const dataRowIndex = tableHeaderRowIndex + 1;
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
      tableHeaderRowIndexBase0: this._indexCell(
        dataRowIndex,
        colIndexByHeader,
        "tableHeaderRowIndexBase1",
      ),
    };
  }
  private _uniqueTableHeaderRowIndex(guaranteedHeaders: string[]): number {
    const matchingRowIndexes = this.sheet.raw.activeRowIndexes.filter(
      (rowIndex) =>
        guaranteedHeaders.every((header) =>
          this._rowValues(rowIndex).includes(header),
        ),
    );
    if (matchingRowIndexes.length !== 1) {
      throw new Error(
        `Spreadsheet Config Table header row must be the unique row that contains every guaranteed header; found ${matchingRowIndexes.length}.`,
      );
    }
    return matchingRowIndexes[0]!;
  }
  private _rowValues(rowIndex: number): CellValue[] {
    const rowState = this.sheet.raw.rowStates.get(rowIndex);
    return rowState ? [...rowState.values()] : [];
  }
  private _colIndexByHeader(
    tableHeaderRowIndex: number,
    guaranteedHeaders: string[],
  ): Map<string, number> {
    const colIndexByHeader = new Map<string, number>();
    const rowState = this.sheet.raw.rowStates.get(tableHeaderRowIndex);
    if (!rowState) {
      throw new Error("Spreadsheet Config Table header row is not active.");
    }
    for (const [colIndex, value] of rowState.entries()) {
      if (typeof value === "string" && guaranteedHeaders.includes(value)) {
        colIndexByHeader.set(value, colIndex);
      }
    }
    return colIndexByHeader;
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
