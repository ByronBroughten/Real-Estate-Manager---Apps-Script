import {
  SpecificSheetRawBase,
  type HeaderToValueName,
} from "./ClassBases/SpecificSheetRawBase";
import type { ColumnRaw } from "./ColumnRaw";

export class SpecificSheetRaw<
  H2V extends HeaderToValueName<string>,
  HD extends keyof H2V & string = keyof H2V & string,
> extends SpecificSheetRawBase<H2V, HD> {
  prepFetchPrerequisitesForRawColumns() {
    this.sheet.prepFetchProperties();
    this.sheet.prepFetchUniformRowUsingSheetProperties("header");
  }
  prepFetchDataColumnOfFetchedHeader<H extends HD>(header: H): ColumnRaw {
    const colIndex = this.sheet.headerRow.colIndexOfValue(header);
    return this.sheet.column(colIndex).prepfetchAllPreppedDataCells();
  }
  fetchDataColumnOfFetchedHeader<H extends HD>(header: H): ColumnRaw {
    const column = this.prepFetchDataColumnOfFetchedHeader(header);
    this.ss.fetchAllPrepped();
    return column;
  }
  prepFetchDataColumnsUsingHeaders<H extends HD>(
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
