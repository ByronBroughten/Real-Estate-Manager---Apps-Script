import type { UniformRowName } from "../00_base/base";
import type { SheetName } from "../01_generatedConfigs/sheetConfigsTypes";
import { SheetRaw } from "../02_SpreadsheetRaw/SheetRaw";
import { isPreFetchType } from "./ClassTypes/IndexedState";
import { ColumnIndexed } from "./ColumnIndexed";
import { DataRowIndexed } from "./DataRowIndexed";
import { DataSheetIndexed } from "./DataSheetIndexed";
import { SheetCommon } from "./SheetCommon";
import { UniformRowIndexed } from "./UniformRowIndexed";

export interface GatherDataPrerequisitesProps {
  skipFetchingProperties?: boolean;
  includeProgrammaticFacts?: boolean;
}

export class SheetIndexed extends SheetCommon {
  colSchema(columnId: string): ColumnIndexed {
    return this.column(columnId);
  }
  get raw(): SheetRaw {
    return new SheetRaw(this.sheetIndexedProps);
  }
  get sheetName(): SheetName {
    return this.schema.sheetName;
  }
  get data(): DataSheetIndexed {
    return new DataSheetIndexed(this.sheetIndexedProps);
  }
  column(columnId: string): ColumnIndexed {
    return new ColumnIndexed({
      ...this.sheetIndexedProps,
      columnId,
    });
  }
  isActiveColumnId(columnId: string): boolean {
    return this.raw.isActiveColumnId(columnId);
  }
  columnIdByIndex(colIndex: number): string {
    return this.raw.colIdRow.value(colIndex);
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
  row(rowIndex: number): DataRowIndexed | UniformRowIndexed {
    if (this.schema.isUniformRowIndex(rowIndex)) {
      return this.uniformRowByIndex(rowIndex);
    } else {
      return this.data.row(rowIndex);
    }
  }
  fetchOnlyColumnIds(): this {
    this.raw.gatherFetchColumnIds();
    this.raw.ss.fetchAllGathered();
    return this;
  }
  _gatherDataPrerequisites({
    skipFetchingProperties,
  }: GatherDataPrerequisitesProps = {}): void {
    if (!skipFetchingProperties) {
      this.raw.gatherFetchProperties();
    }
    // Skip if a prior prepFetchFull() on the columnId row already covers this identical fetch.
    if (!this.raw.hasQueuedFullRowFetch(this.baseSchema.colIdRowIndex)) {
      this.raw.gatherFetchColumnIds();
    }
  }
  gatherFetchDataPrepped() {
    this.preFetchGridRanges.forEach((pf) => {
      if (isPreFetchType(pf, "fullRow")) {
        this.raw.row(pf.row).gatherFetchFull();
      } else if (isPreFetchType(pf, "fullDataColumn")) {
        this.column(pf.column).raw.data.gatherFetchAll();
      } else if (isPreFetchType(pf, "singleCell")) {
        const colIndex = this.column(pf.column).colIndex;
        this.raw.row(pf.row).cell(colIndex).gatherFetchRange();
      } else {
        throw new Error(`Unknown pre-fetch type: ${pf}`);
      }
    });
  }
  addMissingColumnIds(): number {
    return this.raw.addMissingColumnIds(this.schema.idPrefix);
  }
}
