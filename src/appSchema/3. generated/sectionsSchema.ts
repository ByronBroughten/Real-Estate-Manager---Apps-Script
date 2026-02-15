import { utils } from "../../utilitiesGeneral";
import { Obj, type StrictOmit } from "../../utils/Obj";

import type {
  AllSectionAttributes,
  SectionAttributes,
  SectionName,
} from "../1. attributes/sectionAttributes";
import { allSectionAttributes } from "../1. attributes/sectionAttributes";
import {
  allValueAttributes,
  type AllValueAttributes,
  type ValueName,
} from "../1. attributes/valueAttributes";

import {
  allVarbAttributes,
  type AllVarbAttributes,
  type BaseVarbAttributes,
  type SectionValues,
  type SectionVarbAttributes,
  type VarbAttributes,
  type VarbName,
  type VarbValue,
  type VarbValueAttributes,
  type VarbValueName,
} from "../1. attributes/varbAttributes";

export class SectionsSchema {
  readonly headerRowIdxBase1 = 2; // base 1
  readonly topBodyRowIdxBase1 = 3; // base 1
  private allSectionAttributes: AllSectionAttributes = allSectionAttributes;
  constructor() {}
  section<SN extends SectionName>(sectionName: SN): SectionSchema<SN> {
    return new SectionSchema(sectionName);
  }
  sectionBySheetId(sheetId: number): SectionSchema<SectionName> {
    for (const [sectionName, attributes] of Obj.entries(
      this.allSectionAttributes
    )) {
      if (attributes.sheetId === sheetId) {
        return this.section(sectionName);
      }
    }
    throw new Error(`Section not found for sheetId ${sheetId}`);
  }
  varb<SN extends SectionName, VN extends VarbName<SN>>(
    sectionName: SN,
    varbName: VN
  ): VarbSchema<SN, VN> {
    return new VarbSchema(sectionName, varbName);
  }
}

export class SectionSchema<SN extends SectionName> {
  readonly sectionName: SN;
  private allSectionAttributes: AllSectionAttributes = allSectionAttributes;
  private allVarbAttributes: AllVarbAttributes = allVarbAttributes;
  constructor(sectionName: SN) {
    this.sectionName = sectionName;
  }
  get sections(): SectionsSchema {
    return new SectionsSchema();
  }
  get attributes(): SectionAttributes<SN> {
    return this.allSectionAttributes[this.sectionName];
  }
  get varbAttributes(): SectionVarbAttributes<SN> {
    return this.allVarbAttributes[this.sectionName];
  }
  varb<VN extends VarbName<SN>>(varbName: VN): VarbSchema<SN, VN> {
    return new VarbSchema(this.sectionName, varbName);
  }
  get sheetId(): number {
    return this.attributes.sheetId;
  }
  makeSectionId(): string {
    return utils.id.make(this.attributes.idPrepend);
  }
  get varbNames(): VarbName<SN>[] {
    return Obj.keys(this.allVarbAttributes[this.sectionName]);
  }
  makeDefaultValues(): StrictOmit<SectionValues<SN>, "id"> {
    return this.varbNames.reduce((values, varbName) => {
      if (varbName === "id") {
        return values;
      } else {
        values[varbName] = this.varb(
          varbName
        ).makeDefaultValue() as SectionValues<SN>[typeof varbName];
      }
      return values;
    }, {} as SectionValues<SN>);
  }
  varbDisplayNames(): string[] {
    return this.varbNames.map((vn) => this.varb(vn).displayName);
  }
}

export class VarbSchema<SN extends SectionName, VN extends VarbName<SN>> {
  readonly sectionName: SN;
  readonly varbName: VN;
  private allSectionAttributes: AllSectionAttributes = allSectionAttributes;
  private allVarbAttributes: AllVarbAttributes = allVarbAttributes;
  private allValueAttributes: AllValueAttributes = allValueAttributes;
  constructor(sectionName: SN, varbName: VN) {
    this.sectionName = sectionName;
    this.varbName = varbName;
  }
  private get attributes(): VarbAttributes<SN, VN> {
    return this.allVarbAttributes[this.sectionName][this.varbName];
  }
  validate(value: unknown): VarbValue<SN, VN> {
    return (this.attributes as BaseVarbAttributes).validate(value) as VarbValue<
      SN,
      VN
    >;
  }
  get displayName(): string {
    return (this.attributes as BaseVarbAttributes).displayName;
  }
  get valueName(): VarbValueName<SN, VN> {
    return (this.attributes as BaseVarbAttributes).valueName as VarbValueName<
      SN,
      VN
    >;
  }
  get valueAttributes(): VarbValueAttributes<SN, VN> {
    return this.allValueAttributes[
      this.valueName as ValueName
    ] as VarbValueAttributes<SN, VN>;
  }
  makeDefaultValue(): VarbValue<SN, VN> {
    if (this.varbName === "id") {
      throw new Error("Cannot make default value for id varb");
    }
    return (this.attributes as BaseVarbAttributes).makeDefault() as VarbValue<
      SN,
      VN
    >;
  }
}
