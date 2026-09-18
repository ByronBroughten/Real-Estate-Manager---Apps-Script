import type { CellValue } from "../00_base/CellValues/cellValues";
import {
  getColumnTraitByName,
  type ColumnName,
} from "../01_generatedConfigs/columnConfigsTypes";

type SpreadsheetConfigColumnName = ColumnName<"spreadsheetConfig">;

export class SpreadsheetConfigDataRow {
  private valueByHeader: Map<string, CellValue | "">;
  constructor(valueByHeader: Map<string, CellValue | "">) {
    this.valueByHeader = valueByHeader;
  }
  stringCell(columnName: SpreadsheetConfigColumnName): string {
    const header = spreadsheetConfigHeader(columnName);
    const value = this._nonBlankCell(header);
    if (typeof value !== "string") {
      throw new Error(
        `Spreadsheet Config column "${header}" must be text, got ${JSON.stringify(value)}.`,
      );
    }
    return value;
  }
  indexCell(columnName: SpreadsheetConfigColumnName): number {
    const header = spreadsheetConfigHeader(columnName);
    const value = this._nonBlankCell(header);
    if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
      throw new Error(
        `Spreadsheet Config column "${header}" must be an integer ≥ 1, got ${JSON.stringify(value)}.`,
      );
    }
    return value - 1;
  }
  private _nonBlankCell(header: string): CellValue {
    const value = this.valueByHeader.get(header);
    if (value === undefined) {
      throw new Error(
        `Spreadsheet Config is missing guaranteed column "${header}".`,
      );
    }
    if (value === "") {
      throw new Error(`Spreadsheet Config column "${header}" is blank.`);
    }
    return value;
  }
}

export function spreadsheetConfigHeader(
  columnName: SpreadsheetConfigColumnName,
): string {
  return getColumnTraitByName("spreadsheetConfig", columnName, "header");
}
