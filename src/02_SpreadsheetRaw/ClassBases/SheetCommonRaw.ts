import { Arr } from "../../utils/Arr";
import { Obj } from "../../utils/Obj";
import { ActiveTableRaw } from "../ActiveTableRaw";
import type { SheetGridRangeProps } from "../ClassTypes/AccessorsRaw";
import type {
  SheetChangeProps,
  SheetChangesToSave,
} from "../ClassTypes/StateRaw";
import type { SpreadsheetRaw } from "../SpreadsheetRaw";
import { SheetRawBase } from "./SheetRawBase";

// Not on SheetRawBase: the row and column base classes hang off that.
export abstract class SheetCommonRaw extends SheetRawBase {
  // Abstract: importing SpreadsheetRaw here would close an init-time cycle.
  abstract get ss(): SpreadsheetRaw;
  get activeTable(): ActiveTableRaw {
    const knownTable = this.sheetState.working.knownTable;
    if (knownTable === null) {
      throw new Error(
        `Active table is null for sheetGid ${this.sheetGid}. Ensure that the sheet properties have been fetched.`,
      );
    }
    if (knownTable.endRowIndex <= this.schema.topDataRowIdx) {
      throw new Error(
        `Sheet ${this.sheetLabel} Table must have at least one data row.`,
      );
    }
    return new ActiveTableRaw(this.sheetRawProps);
  }
  get fullTableColIndexes(): number[] {
    return Arr.indexesFromUntil(
      this.activeTable.startColumnIndex,
      this.activeTable.endColumnIndex,
    );
  }
  get changesToSave(): SheetChangesToSave {
    return this.sheetState.writeQueue.sheet;
  }
  // The table's own range, not the layout's: no table means no table columns.
  isTableColIndex(colIndex: number): boolean {
    if (this.sheetState.working.knownTable === null) return false;
    const { startColumnIndex, endColumnIndex } = this.activeTable;
    return colIndex >= startColumnIndex && colIndex < endColumnIndex;
  }
  gatherFetchRange(gr: SheetGridRangeProps): this {
    this.spreadsheetStateRaw.fetchQueue.gridRanges.push({
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
