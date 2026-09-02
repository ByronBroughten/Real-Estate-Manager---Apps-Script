import {
  getSheetTraitByGid,
  type SheetConfig,
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
  get sheetName(): SheetName {
    return this.trait("sheetName") as SheetName;
  }
}
