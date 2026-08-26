import {
  getUniformRowValueName,
  nameDelimiter,
  type NameDelimiter,
  type UniformRowName,
  type UniformRowValueName,
} from "../00_base/base";
import { configSheetGids } from "../01_generatedConfigs/sheetConfigsTypes";
import {
  configGet,
  type SpreadsheetConfig,
} from "../01_generatedConfigs/spreadsheetConfigTypes";
import { Obj } from "../utils/Obj";
import { Str } from "../utils/Str";

export function getHeaderNameByRowIndex(
  rowIndex: number,
): UniformRowName | undefined {
  return rowIndexToUniformName.get(rowIndex);
}

const uniformRowIndexes = {
  columnId: configGet("columnIdRowIdxBase0"),
  colGroupName: configGet("columnGroupRowIdxBase0"),
  action: configGet("actionRowIndexBase0"),
  header: configGet("headerRowIndexBase0"),
};
export function getUniformRowIndex(name: UniformRowName): number {
  return uniformRowIndexes[name];
}

const rowIndexToUniformName = new Map(
  Obj.keys(uniformRowIndexes).map((name) => [uniformRowIndexes[name], name]),
) as Map<number, UniformRowName>;

export class SchemaBase {
  get nameDelimiter(): NameDelimiter {
    return nameDelimiter;
  }
  combineNames<S1 extends string, S2 extends string>(
    name1: S1,
    name2: S2,
  ): `${S1}${NameDelimiter}${S2}` {
    return `${name1}${this.nameDelimiter}${name2}`;
  }
  sheetGids(): number[] {
    return configSheetGids;
  }
  isInSheetGids(sheetGid: number): boolean {
    return configSheetGids.includes(sheetGid);
  }
  config<K extends keyof SpreadsheetConfig>(key: K): SpreadsheetConfig[K] {
    return configGet(key);
  }
  sheetNameFromTitle(sheetTitle: string): string {
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
    return this.config("startTableColIndex");
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
    return this.config("topDataRowIdxBase0");
  }
  get idDelimiter(): string {
    return this.config("idDelimiter");
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
    return `${prefix}${this.config("idDelimiter")}${suffix}`;
  }
  makeUniqueId(prefix: unknown): string {
    const uniqueIdBase = this._makeUniqueIdBase();
    return this.makeId(prefix, uniqueIdBase);
  }
  splitId(id: string): { prefix: string; suffix: string } {
    const arr = id.split(this.config("idDelimiter"));
    if (arr.length !== 2) {
      throw new Error(
        `Invalid id: ${id}. Must be in the format "prefix${this.config(
          "idDelimiter",
        )}suffix"`,
      );
    }
    const [prefix, suffix] = arr;
    if (!prefix || !suffix) {
      throw new Error(
        `Invalid id: ${id}. Must be in the format "prefix${this.config(
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
