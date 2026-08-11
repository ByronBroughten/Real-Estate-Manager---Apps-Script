import { SheetSchemaRaw } from "../../1.1 SpreadsheetSchemaRaw/SheetSchemaRaw";
import type { RawSheetState } from "../Types/RawState";
import {
  SpreadsheetRawBase,
  type SpreadsheetRawProps,
} from "./SpreadsheetRawBase";

export interface SheetRawProps extends SpreadsheetRawProps {
  sheetGid: number;
}

export class SheetRawNotFoundError extends Error {
  constructor(sheetGid: number) {
    super(`Sheet with sheetGid "${sheetGid}" not found.`);
  }
}

export class SheetRawBase extends SpreadsheetRawBase {
  readonly sheetGid: number;
  constructor({ sheetGid, ...rest }: SheetRawProps) {
    super(rest);
    this.sheetGid = sheetGid;
  }
  get sheetSchema() {
    return new SheetSchemaRaw(this.sheetGid);
  }
  get sheetState(): RawSheetState {
    if (!this.rawState.sheets.has(this.sheetGid)) {
      throw new SheetRawNotFoundError(this.sheetGid);
    }
    return this.rawState.sheets.get(this.sheetGid);
  }
  get activeTable(): RawSheetState["activeTable"] {
    return this.sheetState.activeTable;
  }
  get rowStates(): RawSheetState["rowStates"] {
    return this.sheetState.rowStates;
  }
  get activeRowIndexes(): number[] {
    return Array.from(this.sheetState.rowStates.keys());
  }
  get dataRowIndexes(): number[] {
    return this.activeRowIndexes.filter((rowIndex) =>
      this.sheetSchema.isDataRowIndex(rowIndex),
    );
  }
  get rowCount(): number {
    return this.sheetState.rowStates.size;
  }
  get dataRowCount(): number {
    return this.rowCount - this.sheetSchema.topDataRowIdx;
  }
  get sheetRawProps(): SheetRawProps {
    return {
      sheetGid: this.sheetGid,
      ...this.spreadsheetRawProps,
    };
  }
}
