import type { DataColumnRaw } from "./ClassBases/DataColumnRaw";
import {
  SpecificSheetRawBase,
  type HeaderToValueName,
} from "./ClassBases/SpecificSheetRawBase";
import { SpreadsheetRaw } from "./SpreadsheetRaw";

export class SpecificSheetRaw<
  H2V extends HeaderToValueName<string>,
  HD extends keyof H2V & string = keyof H2V & string,
> extends SpecificSheetRawBase<H2V, HD> {
  get ss(): SpreadsheetRaw {
    return new SpreadsheetRaw(this.spreadsheetRawProps);
  }
  prepFetchPrerequisitesForRawColumns() {
    this.sheet.prepFetchPropertiesOnly();
    this.sheet.prepFetchFullUniformRow("header");
  }
  prepFetchDataColumnOfFetchedHeader<H extends HD>(header: H): DataColumnRaw {
    const colIndex = this.sheet.headerRow.colIndexOfValue(header);
    return this.sheet.column(colIndex).data.prepFetchAllDataCells();
  }
  fetchDataColumnOfFetchedHeader<H extends HD>(header: H): DataColumnRaw {
    const column = this.prepFetchDataColumnOfFetchedHeader(header);
    this.ss.fetchAllPrepped();
    return column;
  }
  prepFetchDataColumnsUsingHeaders<H extends HD>(
    ...headers: H[]
  ): Record<H, DataColumnRaw> {
    return headers.reduce(
      (acc, header) => {
        acc[header] = this.prepFetchDataColumnOfFetchedHeader(header);
        return acc;
      },
      {} as Record<H, DataColumnRaw>,
    );
  }
}
