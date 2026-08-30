import type {
  CellValueName,
  UniformRowName,
  UniformRowValue,
  UniformRowValueName,
} from "../00_base/base";
import type { PrimitiveValueName } from "../utils/Val";
import { CellRaw } from "./ClassBases/CellRaw";
import { ColumnCommonRaw } from "./ClassBases/ColumnCommonRaw";
import { DataColumnRaw } from "./ClassBases/DataColumnRaw";

export class ColumnRaw<
  VN extends CellValueName = CellValueName,
> extends ColumnCommonRaw<VN> {
  get data(): DataColumnRaw<VN> {
    return new DataColumnRaw<VN>(this.columnRawProps);
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
  // Called by ColumnConfigOperator._updateProgrammaticValues as one step of
  // its column-config sync flow; not general-purpose API on its own.
  activeValueTitle(): string {
    if (this.activeHeader === "ID") {
      return "id";
    }
    return (
      this.data.activeValidationValueTitle() ?? this._actualPrimitiveValueName()
    );
  }
  // A column's live data-validation formula, e.g. `=valueConfig[Charge Description]`
  // (still the current convention), names one of the enums in valueConfigs.ts.
  private _actualPrimitiveValueName(): PrimitiveValueName {
    const value = this.data.topCell.value();
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
