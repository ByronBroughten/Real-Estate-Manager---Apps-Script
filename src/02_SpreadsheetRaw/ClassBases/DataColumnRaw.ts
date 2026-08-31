import type { GoogleCellValue } from "../../00_base/AppsScriptTypes";
import type { CellValue, CellValueName } from "../../00_base/base";
import { Val } from "../../utils/Val";
import type { RawCellFacts } from "../ClassTypes/RawState";
import { SpreadsheetRaw } from "../SpreadsheetRaw";
import type { CellRaw } from "./CellRaw";
import { ColumnCommonRaw } from "./ColumnCommonRaw";

export class DataColumnRaw<
  VN extends CellValueName = CellValueName,
> extends ColumnCommonRaw<VN> {
  get ss(): SpreadsheetRaw {
    return new SpreadsheetRaw(this.spreadsheetRawProps);
  }
  get valueArr(): CellValue<VN>[] {
    return this.sheet.data.rowIndexesActive.map((rowIndex) =>
      this.value(rowIndex),
    );
  }
  get valueArrFilterEmpty(): CellValue<VN>[] {
    return this.valueArr.filter((value) => value !== "");
  }
  value(rowIndex: number): CellValue<VN> {
    return this.cell(rowIndex).value();
  }
  get valueValidationStrings(): string[] {
    return this.activeTable.columnValidationValues.get(this.colIndex) ?? [];
  }
  get topCell(): CellRaw<VN> {
    return this.cell(this.baseSchema.topDataRowIdx);
  }
  activeValidationValueTitle(): string | null {
    for (const rawValue of this.valueValidationStrings) {
      const match = rawValue.match(/^=valueConfig\[(.+)\]$/);
      if (!match) continue;
      return Val.assert(match[1], "value title match");
    }
    return null;
  }
  updateValue(rowIndex: number, newValue: CellValue<VN>): this {
    this.cell(rowIndex).updateValue(newValue);
    return this;
  }
  // isFormula/numberFormatType are column-wide live facts, sampled from the
  // top data row cell (see SheetRaw._integrateSheetData) — matching
  // ColumnSchemaCommon's schema-based `isFormula`, they're traits of the
  // whole data column, not of any one row. "active" distinguishes these
  // live-sheet reads from that schema-based (generated-config) isFormula.
  integrateActiveFacts(cellValue: GoogleCellValue | undefined): void {
    this.columnCellFacts.set(this.colIndex, {
      isFormula: cellValue?.userEnteredValue?.formulaValue !== undefined,
      numberFormatType: cellValue?.effectiveFormat?.numberFormat?.type,
    });
  }
  get activeIsFormula(): boolean {
    return this._activeFacts.isFormula;
  }
  get activeNumberFormatType(): string | undefined {
    return this._activeFacts.numberFormatType;
  }
  private get _activeFacts(): RawCellFacts {
    return Val.assert(
      this.columnCellFacts.get(this.colIndex),
      `active facts for sheetGid ${this.sheetGid} col ${this.colIndex}`,
    );
  }
  gatherFetchAll(): this {
    this.sheet.gatherFetchRange({
      startRowIndex: this.schema.topDataRowIdx,
      startColumnIndex: this.colIndex,
      endColumnIndex: this.colIndex + 1,
    });
    this.sheetState.colIndexesToFinalize.add(this.colIndex);
    return this;
  }
  // A full-column fetch can hit rows that are entirely blank across every
  // column, which Sheets omits from the response outright — ensureStateExists
  // backfills those before ensureActive tries to touch a cell in them.
  ensureFullActiveDataCells(): void {
    this.sheet.data.fullDataRowIndexes.forEach((rowIndex) => {
      this.sheet.data.row(rowIndex).ensureStateExists();
      this.cell(rowIndex).ensureActive();
    });
  }
}
