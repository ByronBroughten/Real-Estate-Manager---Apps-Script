import { Val } from "../utils/Val";
import type { SheetRawProps } from "./ClassBases/SheetRawBase";
import type {
  RawColumnDeclaredTypes,
  RawColumnValidationValues,
  RawKnownTable,
  RawSheetState,
  RawState,
} from "./ClassTypes/RawState";

export class ActiveTableRaw {
  readonly sheetGid: number;
  private readonly rawState: RawState;
  constructor({ sheetGid, rawState }: SheetRawProps) {
    this.sheetGid = sheetGid;
    this.rawState = rawState;
  }
  get tableId(): string {
    return this._knownTable().tableId;
  }
  get startRowIndex(): number {
    return this._knownTable().startRowIndex;
  }
  get endRowIndex(): number {
    this._assertRowIndexesAreValid();
    return this._knownTable().endRowIndex;
  }
  set endRowIndex(endRowIndex: number) {
    this._assertRowIndexesAreValid();
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
  get columnValidationValues(): RawColumnValidationValues {
    return this._knownTable().columnValidationValues;
  }
  get columnDeclaredTypes(): RawColumnDeclaredTypes {
    return this._knownTable().columnDeclaredTypes;
  }
  get rowIndexesAreValid(): boolean {
    return this._knownTable().rowIndexesAreValid;
  }
  growEndRowIndex(): void {
    this.endRowIndex++;
  }
  growEndColumnIndex(): void {
    this.endColumnIndex++;
  }
  invalidateRowIndexes(): void {
    this._knownTable().rowIndexesAreValid = false;
  }
  validateRowIndexes(): void {
    this._knownTable().rowIndexesAreValid = true;
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
  private get sheetState(): RawSheetState {
    return Val.assert(
      this.rawState.sheets.get(this.sheetGid),
      `sheetState for sheetGid ${this.sheetGid}`,
    );
  }
  private _knownTable(): RawKnownTable {
    const knownTable = this.sheetState.knownTable;
    if (knownTable === null) {
      throw new Error(
        `Active table is null for sheetGid ${this.sheetGid}. Ensure that the sheet properties have been fetched.`,
      );
    }
    return knownTable;
  }
  private _assertRowIndexesAreValid(): void {
    if (!this._knownTable().rowIndexesAreValid) {
      throw new Error(
        `Row indexes are not valid for sheetGid ${this.sheetGid}.`,
      );
    }
  }
}
