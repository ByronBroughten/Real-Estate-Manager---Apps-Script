import type { GoogleCellValue } from "../00_base/AppsScriptTypes";
import type {
  CellValue,
  CellValueName,
  UniformRowName,
  UniformRowValue,
  UniformRowValueName,
} from "../00_base/base";
import type { BaseValueName } from "../00_base/baseValueSchemas";
import { Val, type PrimitiveValueName } from "../utils/Val";
import { CellRaw } from "./CellRaw";
import { ColumnRawBase } from "./ClassBases/ColumnRawBase";
import type { RawCellFacts } from "./ClassTypes/RawState";
import { ColumnRaw } from "./ColumnRaw";
import { SheetMetaRaw } from "./SheetMetaRaw";

export class ColumnMetaRaw<
  VN extends CellValueName = CellValueName,
> extends ColumnRawBase {
  get sheet(): SheetMetaRaw {
    return new SheetMetaRaw(this.sheetRawProps);
  }
  get primary(): ColumnRaw<VN> {
    return new ColumnRaw<VN>(this.columnRawProps);
  }
  get activeHeader() {
    return this.uniformCell("header").valueOrEmpty();
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
    const facts = this.columnCellFacts.get(this.colIndex);
    if (facts === undefined) {
      throw new Error(
        `No active facts for column index ${this.colIndex} of sheet ${this.sheetLabel}: ` +
          `nothing fetched its top data row in full. A column that was fetched and is ` +
          `simply empty reports blank facts instead.`,
      );
    }
    return facts;
  }
  get valueValidationStrings(): string[] {
    return this.activeTable.columnValidationValues.get(this.colIndex) ?? [];
  }
  get activeDeclaredColumnType(): string | undefined {
    return this.activeTable.columnDeclaredTypes.get(this.colIndex);
  }
  uniformCell<UN extends UniformRowName>(
    rowName: UN,
  ): CellRaw<UniformRowValueName<UN>> {
    return new CellRaw<UniformRowValueName<UN>>({
      ...this.columnRawProps,
      rowIndex: this.schema.uniformRowIndex(rowName),
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
      topValue: this.primary.topCell.valueOrEmpty(), // sampled now; the row can be pruned later
    });
  }
  // Gap-filling only, so a fact the payload described always wins.
  ensureActiveFacts(): void {
    if (this.columnCellFacts.has(this.colIndex)) return;
    if (!this.primary.topCell.isActive) return; // no top data row to sample
    this.integrateActiveFacts(undefined);
  }
  activeValueTitle(): string {
    return this.activeDeclaredValueTitle() ?? this._actualPrimitiveValueName();
  }
  // Null means nothing on the sheet says what this column holds.
  activeDeclaredValueTitle(): string | null {
    if (this.activeHeader === this.schema.idHeader) {
      return "id";
    }
    return this.activeValidationValueTitle() ?? this._declaredValueName();
  }
  activeValidationValueTitle(): string | null {
    for (const rawValue of this.valueValidationStrings) {
      const match = rawValue.match(/^=valueConfig\[(.+)\]$/);
      if (!match) continue;
      return Val.assert(match[1], "value title match");
    }
    return null;
  }
  private _declaredValueName(): BaseValueName | null {
    const columnType = this.activeDeclaredColumnType;
    if (columnType === undefined) {
      return null;
    }
    return columnTypeValueNames[columnType] ?? null;
  }
  private _actualPrimitiveValueName(): PrimitiveValueName {
    const value = this.activeTopValue;
    if (typeof value === "boolean") {
      return "boolean";
    }
    if (typeof value === "number") {
      return this._numberFormatValueName() === "date" ? "date" : "number";
    }
    if (value === "") {
      return this._numberFormatValueName() ?? "string";
    }
    return "string";
  }
  private _numberFormatValueName(): PrimitiveValueName | null {
    const formatType = this.activeNumberFormatType;
    if (formatType === undefined) {
      return null;
    }
    return numberFormatValueNames[formatType] ?? null;
  }
}

// DROPDOWN and COLUMN_TYPE_UNSPECIFIED are absent: neither says what a column holds.
const columnTypeValueNames: Record<string, BaseValueName> = {
  DOUBLE: "number",
  CURRENCY: "number",
  PERCENT: "number",
  DATE: "date",
  TIME: "number",
  DATE_TIME: "number",
  TEXT: "string",
  FILES_CHIP: "string",
  PEOPLE_CHIP: "string",
  FINANCE_CHIP: "string",
  PLACE_CHIP: "string",
  RATINGS_CHIP: "string",
  // Declaring the type is what earns the never-blank guarantee; a sampled boolean doesn't.
  BOOLEAN: "checkbox",
};

const numberFormatValueNames: Record<string, PrimitiveValueName> = {
  DATE: "date",
  TIME: "number",
  DATE_TIME: "number",
  NUMBER: "number",
  CURRENCY: "number",
  PERCENT: "number",
};
