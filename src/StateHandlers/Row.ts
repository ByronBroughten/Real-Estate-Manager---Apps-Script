import type { SectionName } from "../appSchema/1. names/sectionNames";
import type { ValueName } from "../appSchema/1. names/valueNames";
import type { Value } from "../appSchema/2. attributes/allValueAttributes";
import type {
  SectionValues,
  VarbName,
  VarbValue,
} from "../appSchema/2. attributes/sectionVarbAttributes";
import type { SectionSchema } from "../appSchema/4. generated/sectionsSchema";
import {
  asU,
  type StandardizedValue,
  type UserEnteredValue,
} from "../utilitiesAppsScript";
import { Obj } from "../utils/Obj";
import { valS } from "../utils/validation";
import { RowBase, type RowState } from "./HandlerBases/RowBase";
import type { ChangesToSave } from "./HandlerBases/SheetBase";
import { Sheet } from "./Sheet";

export class Row<SN extends SectionName> extends RowBase<SN> {
  get schema(): SectionSchema<SN> {
    return this.sectionSchema;
  }
  get state(): RowState<SN> {
    return this.rowState;
  }
  get base1Idx(): number {
    const { topBodyRowIdxBase1 } = this.sheet;
    const baseIdx = this.sheetState.bodyRowOrder.indexOf(this.id);
    return baseIdx + topBodyRowIdxBase1;
  }
  value<VN extends VarbName<SN>>(varbName: VN): VarbValue<SN, VN> {
    return this.rowState[varbName] as VarbValue<SN, VN>;
  }
  valueStandardized<VN extends VarbName<SN>>(
    varbName: VN
  ): StandardizedValue<VarbValue<SN, VN>> {
    return asU.standardize.value(this.value(varbName)) as StandardizedValue<
      VarbValue<SN, VN>
    >;
  }
  valueUserEntered(varbName: VarbName<SN>): UserEnteredValue {
    const value = this.value(varbName);
    if (valS.is.string(value)) {
      if (value[0] === "=") {
        return { formulaValue: value };
      } else {
        return { stringValue: value };
      }
    } else if (valS.is.date(value)) {
      return { stringValue: asU.standardize.date(value) };
    } else if (valS.is.number(value)) {
      return { numberValue: value };
    } else if (valS.is.boolean(value)) {
      return { boolValue: value };
    }
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
  get changesToSave(): ChangesToSave<SN> {
    return this.sheetState.changesToSave;
  }
  get sheet(): Sheet<SN> {
    return new Sheet(this.sheetProps);
  }
  resetToDefault() {
    this.setValues(
      this.schema.makeDefaultValues() as Partial<SectionValues<SN>>
    );
  }
  setValue<VN extends VarbName<SN>, VL extends VarbValue<SN, VN>>(
    varbName: VN,
    value: VL
  ): Row<SN> {
    this.rowState[varbName] = value as RowState<SN>[VN];
    this.sheet.addChangeToSave(this.id, {
      action: "update",
      varbNames: [varbName],
    });
    return this;
  }
  setValueType<VN extends VarbName<SN>>(
    varbName: VN,
    valueName: ValueName,
    value: Value
  ): Row<SN> {
    const schema = this.schema.varb(varbName);
    if (schema.valueName !== valueName) {
      throw new Error(
        `Value name ${valueName} does not match varb value name ${schema.valueName}`
      );
    }

    value = schema.validate(value);
    this.setValue(varbName, value as VarbValue<SN, VN>);
    return this;
  }
  setValues(sectionValues: Partial<SectionValues<SN>>): Row<SN> {
    sectionValues = Obj.pick(sectionValues, this.varbNames) as Partial<
      SectionValues<SN>
    >;
    for (const [varbName, value] of Obj.entries(sectionValues)) {
      this.setValue(varbName, value as VarbValue<SN, typeof varbName>);
    }
    return this;
  }
}
