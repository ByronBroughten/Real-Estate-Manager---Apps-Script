import type { NotEmpty } from "../00_base/base";
import type {
  ConditionalFormatDeclaration,
  ConditionalFormatRule,
} from "../00_base/ConditionalFormat";
import type {
  EditLockDeclaration,
  EditWarningDeclaration,
  ProtectedRange,
} from "../00_base/ProtectedRange";
import type { RgbColor } from "../00_base/RgbColor";
import type {
  ColumnIsFormula,
  ColumnName,
  ColumnValue,
  ColumnValueDeclared,
  ColumnValueName,
} from "../01_generatedConfigs/columnConfigsTypes";
import type { SheetName } from "../01_generatedConfigs/sheetConfigsTypes";
import type {
  Value,
  ValueName,
  VnToCvn,
} from "../01_generatedConfigs/valueSchemas";
import type { CellRaw } from "../02_SpreadsheetRaw/CellRaw";
import type { CellIndexed } from "../03_SpreadsheetIndexed/CellIndexed";
import { CellNamedBase } from "./ClassBases/CellNamedBase";
import { ColumnNamed } from "./ColumnNamed";

export class CellNamed<
  SN extends SheetName,
  CN extends ColumnName<SN> = ColumnName<SN>,
> extends CellNamedBase<SN, CN> {
  get column(): ColumnNamed<SN, CN> {
    return new ColumnNamed(this.columnNamedProps);
  }
  get indexed(): CellIndexed<ColumnValueName<SN, CN>> {
    return this.column.indexed.cell(this.rowIndex);
  }
  get raw(): CellRaw<VnToCvn<ColumnValueName<SN, CN>>> {
    return this.indexed.raw;
  }
  get isActive(): boolean {
    return this.indexed.isActive;
  }
  valueOrEmpty(): ColumnValue<SN, CN> {
    return this.indexed.valueOrEmpty();
  }
  // Checked here, not delegated, so the message names the column the caller wrote.
  valueNotEmpty(): NotEmpty<ColumnValue<SN, CN>> {
    const value = this.valueOrEmpty();
    if (value === "") {
      throw new Error(
        `Column "${this.columnName}" of sheet "${this.sheetName}" is empty in row ${this.rowIndex}.`,
      );
    } else {
      return value as NotEmpty<ColumnValue<SN, CN>>;
    }
  }
  value(): ColumnValueDeclared<SN, CN> {
    if (this.schema.emptyValueAllowed) {
      return this.valueOrEmpty() as ColumnValueDeclared<SN, CN>;
    } else {
      return this.valueNotEmpty() as ColumnValueDeclared<SN, CN>;
    }
  }
  updateValue(value: ColumnValue<SN, CN>): this {
    this.indexed.updateValue(value);
    return this;
  }
  updateFormula(
    formula: ColumnIsFormula<SN, CN> extends true ? string : never,
  ): this {
    this.indexed.updateFormula(formula);
    return this;
  }
  updateBackgroundColor(backgroundColor: RgbColor): this {
    this.indexed.updateBackgroundColor(backgroundColor);
    return this;
  }
  updateToDefault(): this {
    this.indexed.updateToDefault();
    return this;
  }
  setValueType(valueName: ValueName, value: Value): this {
    if (this.schema.valueName !== valueName) {
      throw new Error(
        `Value name ${valueName} does not match varb value name ${this.schema.valueName}`,
      );
    }
    const validated = this.schema.validate(value);
    this.updateValue(validated as ColumnValue<SN, CN>);
    return this;
  }
  addConditionalFormatRule(declaration: ConditionalFormatDeclaration): this {
    this.indexed.addConditionalFormatRule(declaration);
    return this;
  }
  removeConditionalFormatRules(): this {
    this.indexed.removeConditionalFormatRules();
    return this;
  }
  removeConditionalFormatRule(rule: ConditionalFormatRule): this {
    this.indexed.removeConditionalFormatRule(rule);
    return this;
  }
  addEditWarning(declaration: EditWarningDeclaration = {}): this {
    this.indexed.addEditWarning(declaration);
    return this;
  }
  addEditLock(declaration: EditLockDeclaration = {}): this {
    this.indexed.addEditLock(declaration);
    return this;
  }
  removeEditProtections(): this {
    this.indexed.removeEditProtections();
    return this;
  }
  removeEditProtection(protection: ProtectedRange): this {
    this.indexed.removeEditProtection(protection);
    return this;
  }
  anchoredA1(columnName: ColumnName<SN> = this.columnName): string {
    const colIndex = this.column.sheet.column(columnName).indexed.colIndex;
    return this.indexed.anchoredA1(colIndex);
  }
}
