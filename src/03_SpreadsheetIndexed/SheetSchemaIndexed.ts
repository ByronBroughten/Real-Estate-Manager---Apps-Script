import type { CellValue } from "../00_base/base";
import type { SheetConfig } from "../01_generatedConfigs/sheetConfigBuilder";
import {
  getSheetTraitByGid,
  type SheetName,
} from "../01_generatedConfigs/sheetConfigsTypes";
import { ColumnSchemaIndexed } from "./ColumnSchemaIndexed";
import { SheetSchemaCommon } from "./SheetSchemaCommon";

export class SheetSchemaIndexed extends SheetSchemaCommon {
  readonly sheetGid: number;
  constructor(sheetGid: number) {
    super();
    this.sheetGid = sheetGid;
    this.validateSheetGid();
  }
  trait<K extends keyof SheetConfig>(key: K): SheetConfig[K] {
    return getSheetTraitByGid(this.sheetGid, key);
  }
  column(columnId: string): ColumnSchemaIndexed {
    return new ColumnSchemaIndexed({
      sheetGid: this.sheetGid,
      columnId,
    });
  }
  get nonFormulaColumnIds(): string[] {
    return [...this.columnIds].filter((columnId) => {
      return !this.column(columnId).isFormula;
    });
  }
  makeColumnId(): string {
    return this.makeColIdFromPrefix(this.trait("idPrefix"));
  }
  get sheetName(): SheetName {
    return this.trait("sheetName") as SheetName;
  }
  allDefaultValues(): Map<string, CellValue> {
    return this.defaultValues(...this.columnIds);
  }
  defaultValues(...columnIds: string[]): Map<string, CellValue> {
    return columnIds.reduce(
      (acc, columnId) => {
        acc.set(columnId, this.column(columnId).makeDefaultDataValue());
        return acc;
      },
      new Map() as Map<string, CellValue>,
    );
  }
}
