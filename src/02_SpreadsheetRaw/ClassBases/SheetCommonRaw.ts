import { Arr } from "../../utils/Arr";
import { Obj } from "../../utils/Obj";
import type { SheetGridRangeProps } from "../ClassTypes/AccessorsRaw";
import type {
  SheetChangeProps,
  SheetChangesToSave,
} from "../ClassTypes/RawState";
import type { SpreadsheetRaw } from "../SpreadsheetRaw";
import { SheetRawBase } from "./SheetRawBase";

// The row and column base classes hang off SheetRawBase, so sheet-level
// members both sheet views need live here rather than one level down.
export abstract class SheetCommonRaw extends SheetRawBase {
  // Abstract, not implemented here: importing SpreadsheetRaw as a value would
  // close an init-time cycle through the two subclasses' extends clauses.
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
