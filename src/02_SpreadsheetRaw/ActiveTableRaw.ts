import { Val } from "../utils/Val";
import type { SheetRawProps } from "./ClassBases/SheetBaseRaw";
import type {
  KnownTableRaw,
  SheetStateRaw,
  StateRaw,
} from "./ClassTypes/StateRaw";

export class ActiveTableRaw {
  readonly sheetGid: number;
  private readonly spreadsheetStateRaw: StateRaw;
  constructor({ sheetGid, spreadsheetStateRaw }: SheetRawProps) {
    this.sheetGid = sheetGid;
    this.spreadsheetStateRaw = spreadsheetStateRaw;
  }
  get tableId(): string {
    return this._knownTable().tableId;
  }
  get startRowIndex(): number {
    return this._knownTable().startRowIndex;
  }
  get endRowIndex(): number {
    this.assertRowIndexesNotStale();
    return this._knownTable().endRowIndex;
  }
  set endRowIndex(endRowIndex: number) {
    this.assertRowIndexesNotStale();
    this._knownTable().endRowIndex = endRowIndex;
  }
  get startColumnIndex(): number {
    return this._knownTable().startColumnIndex;
  }
  get endColumnIndex(): number {
    return this._knownTable().endColumnIndex;
  }
  set endColumnIndex(endColumnIndex: number) {
    this._knownTable().endColumnIndex = endColumnIndex;
  }
  get rowIndexesAreStale(): boolean {
    return this._knownTable().rowIndexesAreStale;
  }
  growEndRowIndex(): void {
    this.endRowIndex++;
  }
  growEndColumnIndex(): void {
    this.endColumnIndex++;
  }
  markRowIndexesStale(): void {
    this._knownTable().rowIndexesAreStale = true;
  }
  clearRowIndexStale(): void {
    this._knownTable().rowIndexesAreStale = false;
  }
  assertKnown(): void {
    this._knownTable();
  }
  assertRowIndexesNotStale(): void {
    if (!this._knownTable().rowIndexesAreStale) return;
    throw new Error(`Row indexes are stale for sheetGid ${this.sheetGid}.`);
  }
  ensureColIndexIsStale(colIndex: number): void {
    const knownTable = this._knownTable();
    knownTable.firstStaleColIndex = Math.min(
      knownTable.firstStaleColIndex ?? Infinity,
      colIndex,
    );
  }
  validateColIndexNotStale(colIndex: number): void {
    const { firstStaleColIndex } = this._knownTable();
    if (firstStaleColIndex !== null && colIndex >= firstStaleColIndex) {
      throw new Error(
        `Column index ${colIndex} is stale. First stale column index is ${firstStaleColIndex}.`,
      );
    }
  }
  private get sheetState(): SheetStateRaw {
    return Val.assert(
      this.spreadsheetStateRaw.sheets.get(this.sheetGid),
      `sheetState for sheetGid ${this.sheetGid}`,
    );
  }
  private _knownTable(): KnownTableRaw {
    const knownTable = this.sheetState.working.knownTable;
    if (knownTable === null) {
      throw new Error(
        `Active table is null for sheetGid ${this.sheetGid}. Ensure that the sheet properties have been fetched.`,
      );
    }
    return knownTable;
  }
}
