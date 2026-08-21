import {
  getColumnTraitByIndex,
  type ColTraitsRaw,
  type ColumnFullNameSimple,
} from "../02_generatedTraits/03_columnTraits";
import type { ValueName } from "../02_generatedTraits/06_valueSchemas";
import { ColumnSchemaCommon } from "./ColumnSchemaCommon";
import { SheetSchemaIndexed } from "./SheetSchemaIndexed";

interface ColumnSchemaIndexedProps {
  sheetGid: number;
  columnId: string;
}

export class ColumnSchemaIndexed extends ColumnSchemaCommon {
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
  trait<K extends keyof ColTraitsRaw>(key: K): ColTraitsRaw[K] {
    return getColumnTraitByIndex(this.sheetGid, this.columnId, key);
  }
  get valueName(): ValueName {
    return this.trait("valueName");
  }
  makeRowId(): string {
    return this.sheet.makeRowId();
  }
}
