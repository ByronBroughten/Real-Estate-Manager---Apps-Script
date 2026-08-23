import type {
  UniformRowName,
  UniformRowValue,
  UniformRowValueName,
} from "../00_base/base";
import { UniformRow } from "../02_SpreadsheetRaw/UniformRow";
import { RowCommonIndexed } from "./RowCommonIndexed";
import type { RowIndexedProps } from "./RowIndexedBase";

export interface UniformRowIndexedProps<UN extends UniformRowName>
  extends RowIndexedProps {
  uniformRowName: UN;
}

export class UniformRowIndexed<
  UN extends UniformRowName = UniformRowName,
> extends RowCommonIndexed {
  readonly uniformRowName: UN;
  constructor({ uniformRowName, ...rest }: UniformRowIndexedProps<UN>) {
    super(rest);
    this.uniformRowName = uniformRowName;
    this.baseSchema.validateUniformRowIndex(this.rowIndex, this.uniformRowName);
  }
  get raw(): UniformRow<UN> {
    return new UniformRow({
      ...this.rowIndexedProps,
      uniformRowName: this.uniformRowName,
    });
  }
  get valueName(): UniformRowValueName<UN> {
    return this.baseSchema.uniformValueName(this.uniformRowName);
  }
  uniformValue(columnId: string): UniformRowValue<UN> {
    return this.raw.uniformValue(this.sheet.column(columnId).colIndex);
  }
  updateValue(columnId: string, value: UniformRowValue<UN>): this {
    this.raw.updateValue(this.sheet.column(columnId).colIndex, value);
    return this;
  }
}
