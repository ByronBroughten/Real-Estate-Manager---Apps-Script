import {
  configGet,
  type SpreadsheetConfig,
} from "../0. spreadsheetMetaData/1. spreadsheetConfig";

export class SchemaBase {
  config<K extends keyof SpreadsheetConfig>(key: K): SpreadsheetConfig[K] {
    return configGet(key);
  }
  get colIdRowIdx(): number {
    return this.config("columnIdRowIdxBase0");
  }
  get topDataRowIdx(): number {
    return this.config("topDataRowIdxBase0");
  }
  get headerRowIdx(): number {
    return this.config("headerRowIdxBase0");
  }
  get actionRowIdx(): number {
    return this.config("actionRowIdxBase0");
  }
  get idDelimiter(): string {
    return this.config("idDelimiter");
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
