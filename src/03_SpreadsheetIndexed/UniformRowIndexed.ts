import type {
  UniformRowName,
  UniformRowValue,
  UniformRowValueName,
} from "../00_base/CellValues/cellValues";
import type {
  EditLockDeclaration,
  EditWarningDeclaration,
  ProtectedRange,
} from "../00_base/RawSource/ProtectedRange";
import { getUniformRowIndex } from "../02_SpreadsheetRaw/Schema/SchemaBase";
import { UniformRowRaw } from "../02_SpreadsheetRaw/UniformRowRaw";
import type { StrictOmit } from "../utils/Obj";
import type { RowIndexedProps } from "./ClassBases/RowBaseIndexed";
import { RowCommonIndexed } from "./ClassBases/RowCommonIndexed";
import { SheetIndexed } from "./SheetIndexed";

export interface UniformRowIndexedProps<
  UN extends UniformRowName,
> extends StrictOmit<RowIndexedProps, "rowIndex"> {
  uniformRowName: UN;
}

export class UniformRowIndexed<
  UN extends UniformRowName = UniformRowName,
> extends RowCommonIndexed {
  readonly uniformRowName: UN;
  constructor({ uniformRowName, ...rest }: UniformRowIndexedProps<UN>) {
    super({
      ...rest,
      rowIndex: getUniformRowIndex(uniformRowName),
    });
    this.uniformRowName = uniformRowName;
    this.schema.validateUniformRowIndex(this.rowIndex, this.uniformRowName);
  }
  get sheet(): SheetIndexed {
    return new SheetIndexed(this.sheetIndexedProps);
  }
  get raw(): UniformRowRaw<UN> {
    return new UniformRowRaw({
      ...this.rowIndexedProps,
      uniformRowName: this.uniformRowName,
    });
  }
  get valueName(): UniformRowValueName<UN> {
    return this.schema.uniformValueName(this.uniformRowName);
  }
  valueOrEmpty(columnId: string): UniformRowValue<UN> | "" {
    return this.raw.valueOrEmpty(this.sheet.column(columnId).colIndex);
  }
  get activeValueArr(): (UniformRowValue<UN> | "")[] {
    return this.raw.activeValueArr;
  }
  updateValue(columnId: string, value: UniformRowValue<UN>): this {
    this.raw.updateValue(this.sheet.column(columnId).colIndex, value);
    return this;
  }
  addEditWarning(declaration: EditWarningDeclaration = {}): this {
    this.raw.addEditWarning(declaration);
    return this;
  }
  addEditLock(declaration: EditLockDeclaration = {}): this {
    this.raw.addEditLock(declaration);
    return this;
  }
  removeEditProtections(): this {
    this.raw.removeEditProtections();
    return this;
  }
  removeEditProtection(protection: ProtectedRange): this {
    this.raw.removeEditProtection(protection);
    return this;
  }
}
