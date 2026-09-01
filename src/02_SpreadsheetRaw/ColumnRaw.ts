import type {
  CellValueName,
  UniformRowName,
  UniformRowValue,
  UniformRowValueName,
} from "../00_base/base";
import type { PrimitiveValueName } from "../utils/Val";
import { CellRaw } from "./ClassBases/CellRaw";
import { ColumnRawBase } from "./ClassBases/ColumnRawBase";
import { DataColumnRaw } from "./ClassBases/DataColumnRaw";
import { SheetRaw } from "./SheetRaw";

export class ColumnRaw<
  VN extends CellValueName = CellValueName,
> extends ColumnRawBase<VN> {
  get sheet(): SheetRaw {
    return new SheetRaw(this.sheetRawProps);
  }
  get data(): DataColumnRaw<VN> {
    return new DataColumnRaw<VN>(this.columnRawProps);
  }
  uniformCell<UN extends UniformRowName>(
    rowName: UN,
  ): CellRaw<UniformRowValueName<UN>> {
    const rowIndex = this.baseSchema.uniformRowIndex(rowName);
    const valueName = this.baseSchema.uniformValueName(rowName);
    return new CellRaw<UniformRowValueName<UN>>({
      ...this.columnRawProps,
      rowIndex,
      valueName,
    });
  }
  get activeHeader() {
    return this.uniformCell("header").value();
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
  activeValueTitle(): string {
    if (this.activeHeader === this.baseSchema.idHeader) {
      return "id";
    }
    return (
      this.data.activeValidationValueTitle() ?? this._actualPrimitiveValueName()
    );
  }
  private _actualPrimitiveValueName(): PrimitiveValueName {
    const value = this.data.activeTopValue;
    if (typeof value === "boolean") {
      return "boolean";
    }
    if (typeof value === "number") {
      const formatType = this.data.activeNumberFormatType;
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
