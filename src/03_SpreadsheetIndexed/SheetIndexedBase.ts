import { Val } from "../utils/Val";
import type {
  SheetStateIndexed,
  FetchTargetIndexed,
} from "./ClassTypes/StateIndexed";
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
        fetchTargets: [],
        prepFetchConditionalFormats: false,
        prepFetchProtectedRanges: false,
      });
    }
  }
  protected get sheetState(): SheetStateIndexed {
    return Val.assert(
      this.indexedSheetsState.get(this.sheetGid),
      `sheetState for sheetGid ${this.sheetGid}`,
    );
  }
  get fetchTargets(): FetchTargetIndexed[] {
    return this.sheetState.fetchTargets;
  }
  get isPreppedToFetch(): boolean {
    return (
      this.fetchTargets.length > 0 ||
      this.sheetState.prepFetchConditionalFormats ||
      this.sheetState.prepFetchProtectedRanges
    );
  }
  clearFetchTargets(): void {
    this.sheetState.fetchTargets = [];
    this.sheetState.prepFetchConditionalFormats = false;
    this.sheetState.prepFetchProtectedRanges = false;
  }
}
