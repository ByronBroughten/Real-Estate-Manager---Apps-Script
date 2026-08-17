import {
  getColumnTraitByIndex,
  type ColTraitsRaw,
  type ColumnFullNameSimple,
} from "../02_generatedTraits/03_columnTraits";
import type { ValueName } from "../02_generatedTraits/06_valueSchemas";
import { ColumnSchemaCommon } from "./ColumnSchemaCommon";
import { SheetSchemaIndexed } from "./SheetSchemaIndexed";

export class ColumnSchemaIndexed extends ColumnSchemaCommon {
  readonly sheetId: number;
  readonly colIndex: number;
  constructor(sheetId: number, colIndex: number) {
    super();
    this.sheetId = sheetId;
    this.colIndex = colIndex;
  }
  get sheet(): SheetSchemaIndexed {
    return new SheetSchemaIndexed(this.sheetId);
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
    return getColumnTraitByIndex(this.sheetId, this.colIndex, key);
  }
  get valueName(): ValueName {
    return this.trait("valueName");
  }
  makeRowId(): string {
    return this.sheet.makeRowId();
  }
}
