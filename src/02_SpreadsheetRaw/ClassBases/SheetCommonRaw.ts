import { Arr } from "../../utils/Arr";
import { Obj } from "../../utils/Obj";
import type { SheetGridRangeProps } from "../ClassTypes/AccessorsRaw";
import type {
  SheetChangeProps,
  SheetChangesToSave,
} from "../ClassTypes/RawState";
import type { SpreadsheetRaw } from "../SpreadsheetRaw";
import { SheetRawBase } from "./SheetRawBase";

// Not on SheetRawBase: the row and column base classes hang off that.
export abstract class SheetCommonRaw extends SheetRawBase {
  // Abstract: importing SpreadsheetRaw here would close an init-time cycle.
  abstract get ss(): SpreadsheetRaw;
  get fullTableColIndexes(): number[] {
    return Arr.indexesFromUntil(
      this.schema.startTableColIndex,
      this.activeTable.endColumnIndex,
    );
  }
  get changesToSave(): SheetChangesToSave {
    this._ensureChangesToSaveExists();
    return this.allChangesToSave.get(this.sheetGid) as SheetChangesToSave;
  }
  private _ensureChangesToSaveExists(): void {
    const sheetChangesToSave = this.rawState.changesToSave;
    const sheetGid = this.sheetGid;
    if (!sheetChangesToSave.has(sheetGid)) {
      sheetChangesToSave.set(sheetGid, {
        level: "sheet",
        sort: null,
        insertColumn: null,
        fills: [],
      });
    }
  }
  // The table's own range, not the layout's: no table means no table columns.
  isTableColIndex(colIndex: number): boolean {
    const table = this.sheetState.activeTable;
    if (table === null) return false;
    return (
      colIndex >= table.startColumnIndex && colIndex < table.endColumnIndex
    );
  }
  gatherFetchRange(gr: SheetGridRangeProps): this {
    this.rawState.fetcherGridRanges.push({
      sheetId: this.sheetGid,
      ...gr,
    });
    return this;
  }
  gatherFetchRanges(props: SheetGridRangeProps[]): this {
    props.forEach((props) => this.gatherFetchRange(props));
    return this;
  }
  addSheetChangeToSave(props: SheetChangeProps): this {
    const changes = this.changesToSave;
    switch (props.action) {
      case "sort":
        changes.sort = {
          colIdxToSortBy: props.colIdxToSortBy,
          sortOrder: props.sortOrder,
        };
        break;
      case "insertColumn":
        changes.insertColumn = props.startColumnIndex;
        break;
      case "fill":
        changes.fills.push(Obj.strictOmit(props, "action"));
        break;
      default:
        throw new Error(
          `Invalid action: ${(props as SheetChangeProps).action}. Must be one of "sort", "insertColumn" or "fill".`,
        );
    }
    return this;
  }
}
