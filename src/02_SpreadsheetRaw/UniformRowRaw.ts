import type {
  UniformRowName,
  UniformRowValue,
  UniformRowValueName,
} from "../00_base/base";
import type {
  EditLockDeclaration,
  EditWarningDeclaration,
  ProtectedRange,
} from "../00_base/ProtectedRange";
import { UniformRowRawBase } from "./ClassBases/UniformRowRawBase";

export class UniformRowRaw<
  UN extends UniformRowName = UniformRowName,
> extends UniformRowRawBase<UN> {
  valueOrEmpty(colIndex: number): UniformRowValue<UN> | "" {
    return this.cell<UniformRowValueName<UN>>(colIndex).valueOrEmpty();
  }
  updateValue(colIndex: number, value: UniformRowValue<UN>): this {
    this.cell(colIndex).updateValue(value);
    return this;
  }
  addEditWarning(declaration: EditWarningDeclaration = {}): this {
    this.sheet.addEditWarningAt(
      this.sheet.rowGridRange(this.rowIndex),
      declaration,
    );
    return this;
  }
  addEditLock(declaration: EditLockDeclaration = {}): this {
    this.sheet.addEditLockAt(
      this.sheet.rowGridRange(this.rowIndex),
      declaration,
    );
    return this;
  }
  removeEditProtections(): this {
    this.sheet.removeEditProtectionsAt(this.sheet.rowGridRange(this.rowIndex));
    return this;
  }
  removeEditProtection(protection: ProtectedRange): this {
    this.sheet.removeEditProtection(protection);
    return this;
  }
}
