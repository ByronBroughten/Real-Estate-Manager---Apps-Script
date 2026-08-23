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
  gatherFetchPrerequisitesForRawColumns() {
    this.sheet.gatherFetchProperties();
    this.sheet.uniformRow("header").gatherFetchFull();
  }
  gatherFetchDataColumnOfFetchedHeader<H extends HD>(header: H): DataColumnRaw {
    const colIndex = this.sheet.headerRow.colIndexOfValue(header);
    return this.sheet.column(colIndex).data.gatherFetchAll();
  }
  fetchDataColumnOfFetchedHeader<H extends HD>(header: H): DataColumnRaw {
    const column = this.gatherFetchDataColumnOfFetchedHeader(header);
    this.ss.fetchAllGathered();
    return column;
  }
  gatherFetchDataColumnsUsingHeaders<H extends HD>(
    ...headers: H[]
  ): Record<H, DataColumnRaw> {
    return headers.reduce(
      (acc, header) => {
        acc[header] = this.gatherFetchDataColumnOfFetchedHeader(header);
        return acc;
      },
      {} as Record<H, DataColumnRaw>,
    );
  }
}
