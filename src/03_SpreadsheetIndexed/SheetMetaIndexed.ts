import type { UniformRowName } from "../00_base/base";
import { SheetMetaRaw } from "../02_SpreadsheetRaw/SheetMetaRaw";
import { isPreFetchType } from "./ClassTypes/IndexedState";
import { ColumnMetaIndexed } from "./ColumnMetaIndexed";
import { SheetCommon } from "./SheetCommon";
import { SheetIndexed } from "./SheetIndexed";
import { UniformRowIndexed } from "./UniformRowIndexed";

export interface GatherDataPrerequisitesProps {
  skipFetchingProperties?: boolean;
  includeProgrammaticFacts?: boolean;
}

export class SheetMetaIndexed extends SheetCommon {
  get raw(): SheetMetaRaw {
    return new SheetMetaRaw(this.sheetIndexedProps);
  }
  get primary(): SheetIndexed {
    return new SheetIndexed(this.sheetIndexedProps);
  }
  column(columnId: string): ColumnMetaIndexed {
    return new ColumnMetaIndexed({
      ...this.sheetIndexedProps,
      columnId,
    });
  }
  isActiveColumnId(columnId: string): boolean {
    return this.raw.isActiveColumnId(columnId);
  }
  columnIdByIndex(colIndex: number): string {
    return this.raw.columnIdAt(colIndex);
  }
  uniformRow<UN extends UniformRowName>(rowName: UN): UniformRowIndexed<UN> {
    return new UniformRowIndexed({
      ...this.sheetIndexedProps,
      uniformRowName: rowName,
    });
  }
  uniformRowByIndex(rowIndex: number): UniformRowIndexed {
    return this.uniformRow(this.schema.uniformRowNameByIndex(rowIndex));
  }
  isTableColIndex(colIndex: number): boolean {
    return this.raw.isTableColIndex(colIndex);
  }
  ensureColumnIdsAreFetched(): this {
    this._gatherDataPrerequisites();
    this.raw.ss.fetchAllGathered();
    return this;
  }
  // The columnId row sits above the table, so its filter alone returns no table metadata.
  _gatherDataPrerequisites({
    skipFetchingProperties,
  }: GatherDataPrerequisitesProps = {}): void {
    const startTableColIndex = this.schema.startTableColIndex;
    if (!skipFetchingProperties && !this.raw.primary.hasFetchedProperties) {
      this.raw.primary.gatherFetchProperties(startTableColIndex);
    }
    // Skip if a prior full-row fetch on the columnId row already covers this row.
    if (
      !this.raw.hasFetchedColumnIds &&
      !this.raw.primary.hasQueuedFullRowFetch(this.schema.colIdRowIndex)
    ) {
      this.raw.gatherFetchColumnIdsInit(startTableColIndex);
    }
  }
  gatherFetchDataPrepped() {
    // This is so that table dimensions and columnIndexes can be guaranteed
    // before their fetch requests are generated.
    this.preFetchGridRanges.forEach((pf) => {
      if (isPreFetchType(pf, "fullRow")) {
        this.raw.primary.rowCommon(pf.row).gatherFetchFull();
      } else if (isPreFetchType(pf, "fullDataColumn")) {
        this.column(pf.column).raw.primary.gatherFetchFull();
      } else if (isPreFetchType(pf, "singleCell")) {
        const colIndex = this.column(pf.column).colIndex;
        this.raw.primary.rowCommon(pf.row).cell(colIndex).gatherFetchRange();
      } else {
        throw new Error(`Unknown pre-fetch type: ${pf}`);
      }
    });
  }
  addMissingColumnIds(): number {
    return this.raw.addMissingColumnIds(this.schema.idPrefix);
  }
}
