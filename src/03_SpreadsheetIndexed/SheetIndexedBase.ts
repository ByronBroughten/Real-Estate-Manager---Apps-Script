import { Val } from "../utils/Val";
import type {
  IndexedSheetState,
  PreFetchGridRange,
} from "./ClassTypes/IndexedState";
import {
  SpreadsheetIndexedBase,
  type SpreadsheetIndexedProps,
} from "./SpreadsheetIndexedBase";

export interface SheetIndexedProps extends SpreadsheetIndexedProps {
  sheetGid: number;
}
export class SheetIndexedBase extends SpreadsheetIndexedBase {
  readonly sheetGid: number;
  constructor(props: SheetIndexedProps) {
    super(props);
    this.sheetGid = props.sheetGid;
    this._ensureSheetState();
  }
  get sheetIndexedProps(): SheetIndexedProps {
    return {
      ...this.spreadsheetIndexedProps,
      sheetGid: this.sheetGid,
    };
  }
  private _ensureSheetState() {
    if (!this.indexedSheetsState.has(this.sheetGid)) {
      this.indexedSheetsState.set(this.sheetGid, {
        preFetchGridRanges: [],
      });
    }
  }
  protected get sheetState(): IndexedSheetState {
    return Val.assert(
      this.indexedSheetsState.get(this.sheetGid),
      `sheetState for sheetGid ${this.sheetGid}`,
    );
  }
  get preFetchGridRanges(): PreFetchGridRange[] {
    return this.sheetState.preFetchGridRanges;
  }
  get isPreppedToFetch(): boolean {
    return this.preFetchGridRanges.length > 0;
  }
}
