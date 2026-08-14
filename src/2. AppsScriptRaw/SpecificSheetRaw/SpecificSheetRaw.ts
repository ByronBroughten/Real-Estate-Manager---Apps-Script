import type { ColumnRaw } from "../ColumnRaw";
import { SpreadsheetRaw } from "../SpreadsheetRaw";
import { SpecificSheetRawBase } from "./Base/SpecificSheetRawBase";

export class SpecificSheetRaw<
  HS extends string,
> extends SpecificSheetRawBase<HS> {
  get ss() {
    return new SpreadsheetRaw(this.spreadsheetRawProps);
  }
  get sheet() {
    return this.ss.sheet(this.sheetGid);
  }
  fetchPrerequisitesForColumns() {
    this.sheet.prepFetchProperties();
    this.sheet.prepFetchFullUniformRow("header");
    this.ss.fetchAll();
  }
  prepFetchDataColumnOfFetchedHeader<H extends HS>(header: H): ColumnRaw {
    const colIndex = this.sheet.headerRow.colIndexOfValue(header);
    return this.sheet.column(colIndex).prepFetchAllDataCells();
  }
  fetchDataColumnOfFetchedHeader<H extends HS>(header: H): ColumnRaw {
    const column = this.prepFetchDataColumnOfFetchedHeader(header);
    this.ss.fetchAll();
    return column;
  }
  prepFetchDataColumnsOfFetchedHeaders<H extends HS>(
    ...headers: H[]
  ): Record<H, ColumnRaw> {
    return headers.reduce(
      (acc, header) => {
        acc[header] = this.prepFetchDataColumnOfFetchedHeader(header);
        return acc;
      },
      {} as Record<H, ColumnRaw>,
    );
  }
}
