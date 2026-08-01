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
  get colIdIdxAsFetched() {
    return this.colIdRowIdx - this.topFetchRowIdx;
  }
  get topBodyRowIdxAsFetched() {
    return this.topBodyRowIdx - this.topFetchRowIdx;
  }
  validateConfig() {
    if (this.colIdIdxAsFetched < 0) {
      throw new Error(
        "Column index is not fetched; column cannot be verified.",
      );
    }
    if (this.topBodyRowIdxAsFetched < 0) {
      throw new Error(
        "Top row of table data is not fetched; data will be incomplete.",
      );
    }
  }
}
