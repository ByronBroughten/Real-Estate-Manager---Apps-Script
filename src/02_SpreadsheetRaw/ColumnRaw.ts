import type {
  CellValueName,
  UniformRowName,
  UniformRowValue,
  UniformRowValueName,
} from "../00_base/base";
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
}
