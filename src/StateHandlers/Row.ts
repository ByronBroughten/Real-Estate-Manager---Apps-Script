import type { SectionName } from "../appSchema/1. names/sectionNames";
import type {
  SectionValues,
  VarbName,
  VarbValue,
} from "../appSchema/2. attributes/sectionVarbAttributes";
import type { SectionSchema } from "../appSchema/4. generated/sectionsSchema";
import { Obj } from "../utils/Obj";
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
  get state(): RowState<SN> {
    return this.rowState;
  }
  value<VN extends VarbName<SN>>(varbName: VN): VarbValue<SN, VN> {
    return this.rowState[varbName] as VarbValue<SN, VN>;
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
    return this.schema.varbNames;
  }
  setValue<VN extends VarbName<SN>, VL extends VarbValue<SN, VN>>(
    varbName: VN,
    value: VL
  ): Row<SN> {
    // this needs work

    return this;
  }
  setValues(sectionValues: Partial<SectionValues<SN>>): Row<SN> {
    for (const [varbName, value] of Obj.entries(sectionValues)) {
      this.setValue(varbName, value as VarbValue<SN, typeof varbName>);
    }
    return this;
  }
}
