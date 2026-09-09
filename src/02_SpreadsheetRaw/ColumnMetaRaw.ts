import type { GoogleCellValue } from "../00_base/AppsScriptTypes";
import type {
  CellValue,
  CellValueName,
  UniformRowName,
  UniformRowValue,
  UniformRowValueName,
} from "../00_base/base";
import { Val, type PrimitiveValueName } from "../utils/Val";
import { CellRaw } from "./CellRaw";
import { ColumnRawBase } from "./ClassBases/ColumnRawBase";
import type { RawCellFacts } from "./ClassTypes/RawState";
import { ColumnRaw } from "./ColumnRaw";
import { SheetMetaRaw } from "./SheetMetaRaw";

export class ColumnMetaRaw<
  VN extends CellValueName = CellValueName,
> extends ColumnRawBase<VN> {
  get sheet(): SheetMetaRaw {
    return new SheetMetaRaw(this.sheetRawProps);
  }
  get primary(): ColumnRaw<VN> {
    return new ColumnRaw<VN>(this.columnRawProps);
  }
  get activeHeader() {
    return this.uniformCell("header").value();
  }
  get activeIsFormula(): boolean {
    return this._activeFacts.isFormula;
  }
  get activeNumberFormatType(): string | undefined {
    return this._activeFacts.numberFormatType;
  }
  get activeTopValue(): CellValue {
    return this._activeFacts.topValue;
  }
  private get _activeFacts(): RawCellFacts {
    return Val.assert(
      this.columnCellFacts.get(this.colIndex),
      `active facts for sheetGid ${this.sheetGid} col ${this.colIndex}`,
    );
  }
  get valueValidationStrings(): string[] {
    return this.activeTable.columnValidationValues.get(this.colIndex) ?? [];
  }
  uniformCell<UN extends UniformRowName>(
    rowName: UN,
  ): CellRaw<UniformRowValueName<UN>> {
    const rowIndex = this.schema.uniformRowIndex(rowName);
    const valueName = this.schema.uniformValueName(rowName);
    return new CellRaw<UniformRowValueName<UN>>({
      ...this.columnRawProps,
      rowIndex,
      valueName,
    });
  }
  initUniformCells({
    idPrefix,
    header,
  }: {
    idPrefix: string;
    header: string;
  }): this {
    const columnId = this.sheet.makeColumnId(idPrefix);
    this.uniformCell("columnId").updateValue(columnId);
    this.uniformCell("header").updateValue(header);
    return this;
  }
  updateUniformCell<UN extends UniformRowName>(
    rowName: UN,
    newValue: UniformRowValue<UN>,
  ): this {
    this.uniformCell(rowName).updateValue(newValue);
    return this;
  }
  integrateActiveFacts(cellValue: GoogleCellValue | undefined): void {
    this.columnCellFacts.set(this.colIndex, {
      isFormula: cellValue?.userEnteredValue?.formulaValue !== undefined,
      numberFormatType: cellValue?.effectiveFormat?.numberFormat?.type,
      topValue: this.primary.topCell.value(), // sampled now; the row can be pruned later
    });
  }
  activeValueTitle(): string {
    if (this.activeHeader === this.schema.idHeader) {
      return "id";
    }
    return (
      this.activeValidationValueTitle() ?? this._actualPrimitiveValueName()
    );
  }
  activeValidationValueTitle(): string | null {
    for (const rawValue of this.valueValidationStrings) {
      const match = rawValue.match(/^=valueConfig\[(.+)\]$/);
      if (!match) continue;
      return Val.assert(match[1], "value title match");
    }
    return null;
  }
  private _actualPrimitiveValueName(): PrimitiveValueName {
    const value = this.activeTopValue;
    if (typeof value === "boolean") {
      return "boolean";
    }
    if (typeof value === "number") {
      const formatType = this.activeNumberFormatType;
      if (
        formatType === "DATE" ||
        formatType === "DATE_TIME" ||
        formatType === "TIME"
      ) {
        return "date";
      }
      return "number";
    }
    return "string";
  }
}
