import {
  getColumnTraitByIndex,
  type ColumnConfig,
  type ColumnFullNameSimple,
} from "../01_generatedConfigs/columnConfigsTypes";
import type { ValueName } from "../01_generatedConfigs/valueSchemas";
import { ColumnSchemaCommon } from "./ColumnSchemaCommon";
import { SheetSchemaIndexed } from "./SheetSchemaIndexed";

interface ColumnSchemaIndexedProps {
  sheetGid: number;
  columnId: string;
}

export class ColumnSchemaIndexed<
  VN extends ValueName = ValueName,
> extends ColumnSchemaCommon<VN> {
  readonly sheetGid: number;
  readonly columnId: string;
  constructor(props: ColumnSchemaIndexedProps) {
    super();
    this.sheetGid = props.sheetGid;
    this.columnId = props.columnId;
  }
  get sheet(): SheetSchemaIndexed {
    return new SheetSchemaIndexed(this.sheetGid);
  }
  get columnName(): ColumnFullNameSimple {
    return this.trait("columnName") as ColumnFullNameSimple;
  }
  get fullName(): ColumnFullNameSimple {
    return this.combineNames(
      this.sheet.sheetName,
      this.columnName,
    ) as ColumnFullNameSimple;
  }
  trait<K extends keyof ColumnConfig<VN>>(key: K): ColumnConfig<VN>[K] {
    return getColumnTraitByIndex(
      this.sheetGid,
      this.columnId,
      key,
    ) as ColumnConfig<VN>[K];
  }
  get valueName(): VN {
    return this.trait("valueName") as VN;
  }
  makeRowId(): string {
    return this.sheet.makeRowId();
  }
}
