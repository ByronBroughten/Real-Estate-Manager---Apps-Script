import type { CellValue } from "../00_Source/CellValues/cellValues";
import { spreadsheetConfigColumnLabel } from "../01_SpreadsheetSchema/spreadsheetConfigFields";

export class SpreadsheetConfigDataRow {
  private valueByHeader: Map<string, CellValue | "">;
  constructor(valueByHeader: Map<string, CellValue | "">) {
    this.valueByHeader = valueByHeader;
  }
  stringCell(header: string): string {
    const value = this._nonBlankCell(header);
    if (typeof value !== "string") {
      throw new Error(
        `${spreadsheetConfigColumnLabel(header)} must be text, got ${JSON.stringify(value)}.`,
      );
    }
    return value;
  }
  indexCell(header: string): number {
    const value = this._nonBlankCell(header);
    if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
      throw new Error(
        `${spreadsheetConfigColumnLabel(header)} must be an integer ≥ 1, got ${JSON.stringify(value)}.`,
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
      throw new Error(`${spreadsheetConfigColumnLabel(header)} is blank.`);
    }
    return value;
  }
}
