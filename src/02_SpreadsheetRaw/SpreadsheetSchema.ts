import {
  getUniformRowValueName,
  nameDelimiter,
  type NameDelimiter,
  type UniformRowName,
  type UniformRowValueName,
} from "../00_base/base";
import type { ValueSchemaKey } from "../00_base/valueSchema";
import {
  getColumnTraitByIndex,
  getColumnTraitByName,
  getSheetColumnIds,
  getSheetColumnNames,
  type ColumnConfig,
  type ColumnConfigAt,
  type ColumnFullName,
  type ColumnName,
  type ColumnValue,
  type MakeColumnFullName,
} from "../01_generatedConfigs/columnConfigsTypes";
import {
  configSheetGids,
  configSheetNames,
  getSheetTraitByGid,
  getSheetTraitByName,
  type SheetConfig,
  type SheetName,
} from "../01_generatedConfigs/sheetConfigsTypes";
import {
  ssConfigGet,
  type SpreadsheetConfig,
} from "../01_generatedConfigs/spreadsheetConfigTypes";
import {
  getValTrait,
  type ValueSchema,
} from "../01_generatedConfigs/valueSchemas";
import { Obj } from "../utils/Obj";
import { Str } from "../utils/Str";

const uniformRowIndexes = {
  columnId: ssConfigGet("columnIdRowIdxBase0"),
  colGroupName: ssConfigGet("columnGroupRowIdxBase0"),
  action: ssConfigGet("actionRowIndexBase0"),
  header: ssConfigGet("headerRowIndexBase0"),
};
export function getUniformRowIndex(name: UniformRowName): number {
  return uniformRowIndexes[name];
}

const rowIndexToUniformName = new Map(
  Obj.keys(uniformRowIndexes).map((name) => [uniformRowIndexes[name], name]),
) as Map<number, UniformRowName>;

export class SpreadsheetSchema {
  get nameDelimiter(): NameDelimiter {
    return nameDelimiter;
  }
  combineNames<S1 extends string, S2 extends string>(
    name1: S1,
    name2: S2,
  ): `${S1}${NameDelimiter}${S2}` {
    return `${name1}${this.nameDelimiter}${name2}`;
  }
  isInSheetGids(sheetGid: number): boolean {
    return configSheetGids.includes(sheetGid);
  }
  get sheetNames() {
    return configSheetNames;
  }
  sheetByName<SN extends SheetName>(sheetName: SN): SheetSchema<SN> {
    return SheetSchema.fromSheetName(sheetName);
  }
  sheetByGid(sheetGid: number): SheetSchema {
    return SheetSchema.fromSheetGid(sheetGid);
  }
  private ssConfig<K extends keyof SpreadsheetConfig>(
    key: K,
  ): SpreadsheetConfig[K] {
    return ssConfigGet(key);
  }
  get idHeader(): SpreadsheetConfig["idHeader"] {
    return this.ssConfig("idHeader");
  }
  titleToName(sheetTitle: string): string {
    return Str.sentenceToCamelCase(sheetTitle);
  }
  uniformValueName<UN extends UniformRowName>(
    name: UN,
  ): UniformRowValueName<UN> {
    return getUniformRowValueName(name);
  }
  uniformRowIndex(name: UniformRowName): number {
    return getUniformRowIndex(name);
  }
  uniformRowNameByIndex(rowIndex: number): UniformRowName {
    const uniformRowName = rowIndexToUniformName.get(rowIndex);
    if (!uniformRowName) {
      throw new Error(
        `Row index ${rowIndex} does not correspond to a known uniform row name.`,
      );
    }
    return uniformRowName;
  }
  isUniformRowIndex(rowIndex: number, rowName?: UniformRowName): boolean {
    const isUniform = rowIndexToUniformName.has(rowIndex);
    if (rowName) {
      return isUniform && this.uniformRowNameByIndex(rowIndex) === rowName;
    } else {
      return isUniform;
    }
  }
  validateUniformRowIndex(rowIndex: number, rowName?: UniformRowName): void {
    if (!this.isUniformRowIndex(rowIndex, rowName)) {
      throw new Error(
        `Row index ${rowIndex} is not a uniform row. Uniform rows are: ${Obj.keys(
          uniformRowIndexes,
        )
          .map((name) => `${name} (index ${uniformRowIndexes[name]})`)
          .join(", ")}`,
      );
    }
  }
  isDataRowIndex(rowIndex: number): boolean {
    return rowIndex >= this.topDataRowIdx;
  }
  get startTableColIndex(): number {
    return this.ssConfig("startTableColIndexBase0");
  }
  get colIdRowIndex(): number {
    return uniformRowIndexes.columnId;
  }
  get headerRowIndex(): number {
    return uniformRowIndexes.header;
  }
  get actionRowIndex(): number {
    return uniformRowIndexes.action;
  }
  get topDataRowIdx(): number {
    return this.ssConfig("topDataRowIdxBase0");
  }
  get idDelimiter(): string {
    return this.ssConfig("idDelimiter");
  }
  makeColIdFromPrefix(idPrefix: string): string {
    return this.makeId("c", this._makeSheetDimensionId(idPrefix));
  }
  makeRowIdFromPrefix(idPrefix: string): string {
    return this.makeId("r", this._makeSheetDimensionId(idPrefix));
  }
  private _makeSheetDimensionId(idPrefix: string): string {
    if (!idPrefix) {
      throw new Error(`Attempted to make id for sheet without an idPrefix`);
    }
    return this.makeUniqueId(idPrefix);
  }
  makeId(prefix: unknown, suffix: unknown): string {
    return `${prefix}${this.ssConfig("idDelimiter")}${suffix}`;
  }
  makeUniqueId(prefix: unknown): string {
    const uniqueIdBase = this._makeUniqueIdBase();
    return this.makeId(prefix, uniqueIdBase);
  }
  splitId(id: string): { prefix: string; suffix: string } {
    const arr = id.split(this.ssConfig("idDelimiter"));
    if (arr.length !== 2) {
      throw new Error(
        `Invalid id: ${id}. Must be in the format "prefix${this.ssConfig(
          "idDelimiter",
        )}suffix"`,
      );
    }
    const [prefix, suffix] = arr;
    if (!prefix || !suffix) {
      throw new Error(
        `Invalid id: ${id}. Must be in the format "prefix${this.ssConfig(
          "idDelimiter",
        )}suffix"`,
      );
    }
    return { prefix, suffix };
  }
  idsFromSheetColumnId(sheetColumnId: string): {
    sheetGid: number;
    colIndex: number;
  } {
    const { idx, ...rest } = this._idsFromSheetIdxId(sheetColumnId);
    return { ...rest, colIndex: idx };
  }
  idsFromSheetRowId(sheetRowId: string): {
    sheetGid: number;
    rowIndex: number;
  } {
    const { idx, ...rest } = this._idsFromSheetIdxId(sheetRowId);
    return { ...rest, rowIndex: idx };
  }
  private _idsFromSheetIdxId(sheetRowId: string): {
    sheetGid: number;
    idx: number;
  } {
    const { prefix, suffix } = this.splitId(sheetRowId);
    const sheetGid = parseInt(prefix);
    const idx = parseInt(suffix);
    if (isNaN(sheetGid) || isNaN(idx)) {
      throw new Error(
        `Invalid sheetRowId: ${sheetRowId}. Must be in numeric values with a delimiter.`,
      );
    }
    return { sheetGid, idx };
  }
  private _makeUniqueIdBase(): string {
    const length = 7;
    const alphabet =
      "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_-";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    }
    return result;
  }
}

function sheetNameFromGid(sheetGid: number): SheetName {
  if (!configSheetGids.includes(sheetGid)) {
    throw new Error(
      `Invalid sheetGid: ${sheetGid}. Must be one of: ${configSheetGids.join(", ")}`,
    );
  }
  return getSheetTraitByGid(sheetGid, "sheetName") as SheetName;
}

interface SheetSchemaProps<SN extends SheetName> {
  sheetGid: number;
  sheetName: SN;
}

export class SheetSchema<
  SN extends SheetName = SheetName,
> extends SpreadsheetSchema {
  readonly sheetGid: number;
  readonly sheetName: SN;
  constructor({ sheetGid, sheetName }: SheetSchemaProps<SN>) {
    super();
    this.sheetGid = sheetGid;
    this.sheetName = sheetName;
  }
  static fromSheetName<SN extends SheetName>(sheetName: SN): SheetSchema<SN> {
    return new SheetSchema({
      sheetName,
      sheetGid: getSheetTraitByName(sheetName, "sheetGid"),
    });
  }
  static fromSheetGid(sheetGid: number): SheetSchema {
    return new SheetSchema({
      sheetGid,
      sheetName: sheetNameFromGid(sheetGid),
    });
  }
  trait<K extends keyof SheetConfig>(key: K): SheetConfig[K] {
    return getSheetTraitByGid(this.sheetGid, key);
  }
  get idPrefix(): string {
    return this.trait("idPrefix");
  }
  makeRowId(): string {
    return this.makeRowIdFromPrefix(this.idPrefix);
  }
  get columnIds(): MapIterator<string> {
    return getSheetColumnIds(this.sheetGid);
  }
  get columnNames(): ColumnName<SN>[] {
    return getSheetColumnNames(this.sheetName);
  }
  get nonFormulaColumnIds(): string[] {
    return [...this.columnIds].filter((columnId) => {
      return !getColumnTraitByIndex(this.sheetGid, columnId, "isFormula");
    });
  }
  // Goes by gid, the only O(1) columnId -> columnName index; by name would scan the sheet.
  colNameByColumnId(columnId: string): ColumnName<SN> {
    return getColumnTraitByIndex(
      this.sheetGid,
      columnId,
      "columnName",
    ) as ColumnName<SN>;
  }
  columnByName<CN extends ColumnName<SN>>(
    columnName: CN,
  ): ColumnSchema<SN, CN> {
    return new ColumnSchema({
      ...this.sheetSchemaProps,
      columnName,
      columnId: getColumnTraitByName(this.sheetName, columnName, "columnId"),
    });
  }
  columnById(columnId: string): ColumnSchema<SN, ColumnName<SN>> {
    return new ColumnSchema({
      ...this.sheetSchemaProps,
      columnId,
      columnName: this.colNameByColumnId(columnId),
    });
  }
  columnSpecifierToStandard(
    columnSpecifier: ColumnName<SN> | ColumnName<SN>[] | "allColumns",
  ): ColumnName<SN>[] {
    if (columnSpecifier === "allColumns") {
      return this.columnNames;
    } else if (Array.isArray(columnSpecifier)) {
      return columnSpecifier;
    } else {
      return [columnSpecifier];
    }
  }
  private get sheetSchemaProps(): SheetSchemaProps<SN> {
    return { sheetGid: this.sheetGid, sheetName: this.sheetName };
  }
}

interface ColumnSchemaProps<
  SN extends SheetName,
  CN extends ColumnName<SN>,
> extends SheetSchemaProps<SN> {
  columnId: string;
  columnName: CN;
}

export class ColumnSchema<
  SN extends SheetName = SheetName,
  CN extends ColumnName<SN> = ColumnName<SN>,
> extends SpreadsheetSchema {
  readonly sheetGid: number;
  readonly sheetName: SN;
  readonly columnId: string;
  readonly columnName: CN;
  constructor({
    sheetGid,
    sheetName,
    columnId,
    columnName,
  }: ColumnSchemaProps<SN, CN>) {
    super();
    this.sheetGid = sheetGid;
    this.sheetName = sheetName;
    this.columnId = columnId;
    this.columnName = columnName;
  }
  static fromColumnName<SN extends SheetName, CN extends ColumnName<SN>>(
    sheetName: SN,
    columnName: CN,
  ): ColumnSchema<SN, CN> {
    return SheetSchema.fromSheetName(sheetName).columnByName(columnName);
  }
  static fromColumnId(sheetGid: number, columnId: string): ColumnSchema {
    return SheetSchema.fromSheetGid(sheetGid).columnById(columnId);
  }
  get sheet(): SheetSchema<SN> {
    return new SheetSchema({
      sheetGid: this.sheetGid,
      sheetName: this.sheetName,
    });
  }
  trait<K extends keyof ColumnConfig>(
    key: K,
  ): ColumnConfigAt<SN, CN>[K & keyof ColumnConfigAt<SN, CN>] {
    return getColumnTraitByIndex(
      this.sheetGid,
      this.columnId,
      key,
    ) as ColumnConfigAt<SN, CN>[K & keyof ColumnConfigAt<SN, CN>];
  }
  get valueName(): ColumnConfigAt<SN, CN>["valueName"] {
    return this.trait("valueName");
  }
  valTrait<K extends ValueSchemaKey>(
    key: K,
  ): ValueSchema<ColumnConfigAt<SN, CN>["valueName"]>[K] {
    return getValTrait(this.valueName, key);
  }
  get isFormula(): boolean {
    return this.trait("isFormula");
  }
  get fullName(): MakeColumnFullName<SN, CN> & ColumnFullName {
    return this.combineNames(
      this.sheetName,
      this.columnName as string,
    ) as MakeColumnFullName<SN, CN> & ColumnFullName;
  }
  makeRowId(): string {
    return this.sheet.makeRowId();
  }
  makeDefaultDataValue(): ColumnValue<SN, CN> {
    if ((this.columnName as string) === "id") {
      return this.makeRowId() as ColumnValue<SN, CN>;
    } else {
      return this.valTrait("makeDefault")() as ColumnValue<SN, CN>;
    }
  }
  validate(value: unknown) {
    const emptyAllowed = this.trait("emptyAllowed");
    if (emptyAllowed && value === "") {
      return value;
    } else {
      return this.valTrait("strictValidate")(value);
    }
  }
  validateDataNotFormula(): void {
    if (this.isFormula) {
      throw new Error(
        `Column with id "${this.columnId}" is a formula column and cannot be used for this operation.`,
      );
    }
  }
}
