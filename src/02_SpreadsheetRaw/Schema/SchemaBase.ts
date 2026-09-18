import {
  getUniformRowValueName,
  codebaseNameDelimiter,
  type CodebaseNameDelimiter,
  type UniformRowName,
  type UniformRowValueName,
} from "../../00_base/CellValues/cellValues";
import {
  ssConfigGet,
  type LiveSpreadsheetConfig,
} from "../../01_generatedConfigs/spreadsheetConfigTypes";
import { Obj } from "../../utils/Obj";
import { Str } from "../../utils/Str";

function getUniformRowIndexes(): Record<UniformRowName, number> {
  return {
    columnId: ssConfigGet("columnIdRowIdxBase0"),
    colGroupName: ssConfigGet("columnGroupHeadingRowIndexBase0"),
    action: ssConfigGet("actionRowIndexBase0"),
    tableHeader: ssConfigGet("tableHeaderRowIndexBase0"),
  };
}
export function getUniformRowIndex(name: UniformRowName): number {
  return getUniformRowIndexes()[name];
}

function rowIndexToUniformName(): Map<number, UniformRowName> {
  const uniformRowIndexes = getUniformRowIndexes();
  return new Map(
    Obj.keys(uniformRowIndexes).map((name) => [uniformRowIndexes[name], name]),
  ) as Map<number, UniformRowName>;
}

export class SchemaBase {
  get codebaseNameDelimiter(): CodebaseNameDelimiter {
    return codebaseNameDelimiter;
  }
  combineNames<S1 extends string, S2 extends string>(
    name1: S1,
    name2: S2,
  ): `${S1}${CodebaseNameDelimiter}${S2}` {
    return `${name1}${this.codebaseNameDelimiter}${name2}`;
  }
  get idHeader(): LiveSpreadsheetConfig["idHeader"] {
    return ssConfigGet("idHeader");
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
    const uniformRowName = rowIndexToUniformName().get(rowIndex);
    if (!uniformRowName) {
      throw new Error(
        `Row index ${rowIndex} does not correspond to a known uniform row name.`,
      );
    }
    return uniformRowName;
  }
  isUniformRowIndex(rowIndex: number, rowName?: UniformRowName): boolean {
    const isUniform = rowIndexToUniformName().has(rowIndex);
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
          getUniformRowIndexes(),
        )
          .map((name) => `${name} (index ${getUniformRowIndexes()[name]})`)
          .join(", ")}`,
      );
    }
  }
  isTableStart(startRowIndex: number, startColumnIndex: number): boolean {
    return (
      startRowIndex === this.tableHeaderRowIndex &&
      startColumnIndex === this.startTableColIndex
    );
  }
  validateTableStart(startRowIndex: number, startColumnIndex: number): void {
    if (!this.isTableStart(startRowIndex, startColumnIndex)) {
      throw new Error(
        `A Table starting at ${this.positionLabel(
          startRowIndex,
          startColumnIndex,
        )} must start at ${this.tableStartLabel}.`,
      );
    }
  }
  get tableStartLabel(): string {
    return this.positionLabel(
      this.tableHeaderRowIndex,
      this.startTableColIndex,
    );
  }
  positionLabel(rowIndex: number, colIndex: number): string {
    return `row ${rowIndex + 1}, column ${this.columnLetter(colIndex)}`;
  }
  columnLetter(colIndex: number): string {
    let letters = "";
    let remaining = colIndex;
    while (remaining >= 0) {
      letters = String.fromCharCode(65 + (remaining % 26)) + letters;
      remaining = Math.floor(remaining / 26) - 1;
    }
    return letters;
  }
  anchoredA1(colIndex: number, rowIndex: number): string {
    return `$${this.columnLetter(colIndex)}${rowIndex + 1}`;
  }
  isDataRowIndex(rowIndex: number): boolean {
    return rowIndex >= this.topDataRowIdx;
  }
  get startTableColIndex(): number {
    return ssConfigGet("startTableColIndexBase0");
  }
  get colIdRowIndex(): number {
    return getUniformRowIndexes().columnId;
  }
  get tableHeaderRowIndex(): number {
    return getUniformRowIndexes().tableHeader;
  }
  get actionRowIndex(): number {
    return getUniformRowIndexes().action;
  }
  get topDataRowIdx(): number {
    return this.tableHeaderRowIndex + 1;
  }
  get idDelimiter(): string {
    return ssConfigGet("idDelimiter");
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
    return `${prefix}${ssConfigGet("idDelimiter")}${suffix}`;
  }
  makeUniqueId(prefix: unknown): string {
    const uniqueIdBase = makeUniqueIdBase();
    return this.makeId(prefix, uniqueIdBase);
  }
  splitId(id: string): { prefix: string; suffix: string } {
    const arr = id.split(ssConfigGet("idDelimiter"));
    if (arr.length !== 2) {
      throw new Error(
        `Invalid id: ${id}. Must be in the format "prefix${ssConfigGet(
          "idDelimiter",
        )}suffix"`,
      );
    }
    const [prefix, suffix] = arr;
    if (!prefix || !suffix) {
      throw new Error(
        `Invalid id: ${id}. Must be in the format "prefix${ssConfigGet(
          "idDelimiter",
        )}suffix"`,
      );
    }
    return { prefix, suffix };
  }
}

function makeUniqueIdBase(): string {
  const length = 7;
  const alphabet =
    "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_-";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }
  return result;
}
