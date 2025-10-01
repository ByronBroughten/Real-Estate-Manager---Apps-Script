import { utils } from "../../utilitiesGeneral";
import { Obj } from "../../utils/Obj";
import type { SectionName } from "../1. names/sectionNames";
import type { ValueName } from "../1. names/valueNames";
import {
  allValueAttributes,
  type AllValueAttributes,
} from "../2. attributes/allValueAttributes";
import {
  allSectionAttributes,
  type AllSectionAttributes,
  type SectionAttributes,
} from "../2. attributes/sectionAttributes";
import {
  allVarbAttributes,
  type AllVarbAttributes,
  type BaseVarbAttributes,
  type SectionVarbAttributes,
  type VarbAttributes,
  type VarbName,
  type VarbValue,
  type VarbValueAttributes,
  type VarbValueName,
} from "../2. attributes/sectionVarbAttributes";

export class SectionsSchema {
  readonly headerRowIdx = 1;
  readonly topBodyRowIdx = 2;
  constructor() {}
  section<SN extends SectionName>(sectionName: SN): SectionSchema<SN> {
    return new SectionSchema(sectionName);
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
    return this.valueAttributes.makeDefault() as VarbValue<SN, VN>;
  }
}
