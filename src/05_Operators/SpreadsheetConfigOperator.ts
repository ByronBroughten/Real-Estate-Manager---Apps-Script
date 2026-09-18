import type { CellValue } from "../00_Source/CellValues/cellValues";
import type { ColumnName } from "../01_SpreadsheetSchema/columnConfigsTypes";
import {
  makeImportLine,
  validateSpreadsheetLayoutIndexes,
  type UniformRowLayoutKey,
} from "../01_SpreadsheetSchema/makeConfigs";
import type { LiveSpreadsheetConfig } from "../01_SpreadsheetSchema/spreadsheetConfigTypes";
import { spreadsheetConfigFileSource } from "./configFileSource";
import { GenericSheetOperator } from "./GenericSheetOperator";
import {
  OperatorBase,
  type ConfigSyncState,
  type OperatorProps,
} from "./OperatorBase";
import {
  SpreadsheetConfigDataRow,
  spreadsheetConfigColumnLabel,
  spreadsheetConfigHeader,
} from "./SpreadsheetConfigDataRow";

type SpreadsheetConfigColumnName = ColumnName<"spreadsheetConfig">;

const guaranteedColumns: readonly SpreadsheetConfigColumnName[] = [
  "idDelimiter",
  "idHeader",
  "startTableColumnIndexBase1",
  "columnIdRowIndexBase1",
  "columnGroupHeadingRowIndexBase1",
  "actionRowIndexBase1",
  "tableHeaderRowIndexBase1",
];

export class SpreadsheetConfigOperator extends GenericSheetOperator<"spreadsheetConfig"> {
  constructor(props: OperatorProps) {
    super({
      sheetName: "spreadsheetConfig",
      ...props,
    });
  }
  static init(): SpreadsheetConfigOperator {
    return new SpreadsheetConfigOperator(OperatorBase.initOperatorProps());
  }
  get spreadsheetConfigSync(): ConfigSyncState["spreadsheetConfigSync"] {
    return this.configSyncState.spreadsheetConfigSync;
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
      spreadsheetConfigHeader(columnName),
    );
    const tableHeaderRowIndex =
      this._uniqueTableHeaderRowIndex(guaranteedHeaders);
    const colIndexByHeader = this._colIndexByHeader(
      tableHeaderRowIndex,
      guaranteedHeaders,
    );
    const dataRow = new SpreadsheetConfigDataRow(
      this._valueByHeader(tableHeaderRowIndex + 1, colIndexByHeader),
    );
    const liveConfig = {
      idDelimiter: dataRow.stringCell("idDelimiter"),
      idHeader: dataRow.stringCell("idHeader"),
      startTableColIndexBase0: dataRow.indexCell("startTableColumnIndexBase1"),
      columnIdRowIdxBase0: dataRow.indexCell("columnIdRowIndexBase1"),
      columnGroupHeadingRowIndexBase0: dataRow.indexCell(
        "columnGroupHeadingRowIndexBase1",
      ),
      actionRowIndexBase0: dataRow.indexCell("actionRowIndexBase1"),
      tableHeaderRowIndexBase0: dataRow.indexCell("tableHeaderRowIndexBase1"),
    };
    validateSpreadsheetLayoutIndexes(liveConfig, uniformRowLayoutLabels());
    return liveConfig;
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
    return rowState
      ? [...rowState.values()].map((cellState) => cellState.value)
      : [];
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
    for (const [colIndex, cellState] of rowState.entries()) {
      if (
        typeof cellState.value === "string" &&
        guaranteedHeaders.includes(cellState.value)
      ) {
        colIndexByHeader.set(cellState.value, colIndex);
      }
    }
    return colIndexByHeader;
  }
  private _valueByHeader(
    dataRowIndex: number,
    colIndexByHeader: Map<string, number>,
  ): Map<string, CellValue | ""> {
    return new Map(
      [...colIndexByHeader].map(([header, colIndex]) => [
        header,
        this._cellValueOrEmpty(dataRowIndex, colIndex),
      ]),
    );
  }
  private _cellValueOrEmpty(
    rowIndex: number,
    colIndex: number,
  ): CellValue | "" {
    const rowState = this.sheet.raw.rowStates.get(rowIndex);
    if (!rowState || !rowState.has(colIndex)) {
      return "";
    }
    return rowState.get(colIndex)?.value ?? "";
  }
}

function uniformRowLayoutLabels(): Record<UniformRowLayoutKey, string> {
  return {
    columnIdRowIdxBase0: spreadsheetConfigColumnLabel("columnIdRowIndexBase1"),
    columnGroupHeadingRowIndexBase0: spreadsheetConfigColumnLabel(
      "columnGroupHeadingRowIndexBase1",
    ),
    actionRowIndexBase0: spreadsheetConfigColumnLabel("actionRowIndexBase1"),
    tableHeaderRowIndexBase0: spreadsheetConfigColumnLabel(
      "tableHeaderRowIndexBase1",
    ),
  };
}
