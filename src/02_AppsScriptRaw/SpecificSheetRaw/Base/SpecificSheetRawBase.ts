import type { CellValueName } from "../../../00_traitPrecursors/configPrecursors";
import {
  SheetRawBase,
  type SheetRawProps,
} from "../../ClassBases/SheetRawBase";
import type { ColumnRaw } from "../../ColumnRaw";
import type { SheetRaw } from "../../SheetRaw";
import { SpreadsheetRaw } from "../../SpreadsheetRaw";

export type HeaderToValueName<HD extends string> = Record<HD, CellValueName>;

interface SpecificSheetRawProps<
  H2V extends HeaderToValueName<string>,
> extends SheetRawProps {
  headerToValueName: H2V;
}

export class SpecificSheetRawBase<
  H2V extends HeaderToValueName<string>,
  HD extends keyof H2V & string = keyof H2V & string,
> extends SheetRawBase {
  readonly headerToValueName: H2V;
  constructor({ headerToValueName, ...rest }: SpecificSheetRawProps<H2V>) {
    super(rest);
    this.headerToValueName = headerToValueName;
  }
  get ss() {
    return new SpreadsheetRaw(this.spreadsheetRawProps);
  }
  get sheet(): SheetRaw {
    return this.ss.sheet(this.sheetGid);
  }
  get headers(): HD[] {
    return Object.keys(this.headerToValueName) as HD[];
  }
  column<H extends HD>(header: H): ColumnRaw<H2V[H]> {
    return this.sheet.columnByHeader(
      header,
      this.headerToValueName[header],
    ) as ColumnRaw<H2V[H]>;
  }
}
