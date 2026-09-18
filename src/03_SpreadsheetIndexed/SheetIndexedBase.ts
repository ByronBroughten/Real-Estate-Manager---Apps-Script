import { Val } from "../utils/Val";
import {
  emptySheetFetchQueueIndexed,
  type FetchTargetIndexed,
  type SheetStateIndexed,
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
    if (!this.sheetsStateIndexed.has(this.sheetGid)) {
      this.sheetsStateIndexed.set(this.sheetGid, {
        fetchQueue: emptySheetFetchQueueIndexed(),
      });
    }
  }
  protected get sheetState(): SheetStateIndexed {
    return Val.assert(
      this.sheetsStateIndexed.get(this.sheetGid),
      `sheetState for sheetGid ${this.sheetGid}`,
    );
  }
  get fetchTargets(): FetchTargetIndexed[] {
    return this.sheetState.fetchQueue.targets;
  }
  get isPreppedToFetch(): boolean {
    return (
      this.fetchTargets.length > 0 ||
      this.sheetState.fetchQueue.gatherConditionalFormats ||
      this.sheetState.fetchQueue.gatherProtectedRanges
    );
  }
  clearFetchTargets(): void {
    this.sheetState.fetchQueue = emptySheetFetchQueueIndexed();
  }
}
