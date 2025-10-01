import type { SectionName } from "../appSchema/1. names/sectionNames";
import type { SectionValues } from "../appSchema/2. attributes/sectionVarbAttributes";
import type { SectionSchema } from "../appSchema/4. generated/sectionsSchema";
import { SheetBase, type SheetProps } from "./Sheet";

export type RowState<SN extends SectionName> = SectionValues<SN>;

interface RowProps<SN extends SectionName> extends SheetProps<SN> {
  id: string;
}

export class RowBase<SN extends SectionName> extends SheetBase<SN> {
  readonly id: string;
  constructor({ id, ...props }: RowProps<SN>) {
    super(props);
    this.id = id;
  }
  get rowState(): RowState<SN> {
    return this.sheetState.rows[this.id];
  }
}

export class Row<SN extends SectionName> extends RowBase<SN> {
  get schema(): SectionSchema<SN> {
    return this.sectionSchema;
  }
  get state(): CellValue[] {
    return this.sheet.values[this.rowIdx];
  }
  value<VN extends VarbName<SN>>(varbName: VN): VarbValue<SN, VN> {
    const colIdx = this.sheet.colIdx(varbName);
    return this.rowState[colIdx] as VarbValue<SN, VN>;
  }
  get values(): Omit<SectionValues<SN>, "id"> {
    return this.varbNames.reduce((values, varbName) => {
      if (varbName !== "id") {
        values[varbName] = this.value(
          varbName
        ) as (typeof values)[typeof varbName];
      }
      return values;
    }, {} as SectionValues<SN>);
  }
  validateValues(): Omit<SectionValues<SN>, "id"> {
    const values = this.values;
    for (const [varbName, value] of Obj.entries(values)) {
      this.schema.varb(varbName).validate(value);
    }
    return values;
  }

  get varbNames(): VarbName<SN>[] {
    return this.sheet.sectionSchema.varbNames;
  }
  private setValueByIdx(colIdx: number, value: CellValue) {
    this.rowState[colIdx] = value as any;
  }
  clearValues(): Row<SN> {
    throw new Error("this isn't ready yet");
    this.rowState.forEach((_, idx) => {
      this.setValueByIdx(idx, "");
    });
    return this;
  }
  setValue<VN extends VarbName<SN>, VL extends VarbValue<SN, VN>>(
    varbName: VN,
    value: VL
  ): Row<SN> {
    const colIdx = this.sheet.colIdx(varbName);
    this.setValueByIdx(colIdx, value);
    this.sheet.colUpdated(varbName);
    return this;
  }
  setValues(sectionValues: Partial<SectionValues<SN>>): Row<SN> {
    for (const [varbName, value] of Obj.entries(sectionValues)) {
      this.setValue(varbName, value as VarbValue<SN, typeof varbName>);
    }
    return this;
  }
}
