import {
  configGet,
  type SpreadsheetConfig,
} from "../0. spreadsheetMetaData/1. spreadsheetConfig";

export class SchemaBase {
  config<K extends keyof SpreadsheetConfig>(key: K): SpreadsheetConfig[K] {
    return configGet(key);
  }
  get colIdRowIdx(): number {
    return this.config("columnIdRowIdx");
  }
  get topFetchRowIdx(): number {
    return this.config("topFetchRowIdx");
  }
  get topBodyRowIdx(): number {
    return this.config("topBodyRowIdx");
  }
  get headerRowIdx(): number {
    return this.config("headerRowIdx");
  }
  get idDelimiter(): string {
    return this.config("idDelimiter");
  }
}
