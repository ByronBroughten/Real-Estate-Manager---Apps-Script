import { utils } from "../../utilitiesGeneral";
import { Arr } from "../../utils/Arr";
import { Obj } from "../../utils/Obj";

import type {
  AllSectionAttributes,
  GroupSectionName,
  SectionAttributes,
  SectionName,
  SnGroupName,
} from "../1. attributes/sectionAttributes";
import {
  allSectionAttributes,
  isInSnGroup,
} from "../1. attributes/sectionAttributes";
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

const varbNameImmutable = ["idFormula", "baseId"] as const;
type VarbNameImmutable = (typeof varbNameImmutable)[number];
export type VarbNameMutable<SN extends SectionName> = Exclude<
  VarbName<SN>,
  VarbNameImmutable
>;

export class SectionsSchema {
  readonly headerRowIdxBase1 = 2; // base 1
  readonly topBodyRowIdxBase1 = 3; // base 1
  get secondBodyRownIdxBase1() {
    return this.topBodyRowIdxBase1 + 1;
  }
  private allSectionAttributes: AllSectionAttributes = allSectionAttributes;
  constructor() {}
  section<SN extends SectionName>(sectionName: SN): SectionSchema<SN> {
    return new SectionSchema(sectionName);
  }
  sectionBySheetId(sheetId: number): SectionSchema<SectionName> {
    for (const [sectionName, attributes] of Obj.entries(
      this.allSectionAttributes,
    )) {
      if (attributes.sheetId === sheetId) {
        return this.section(sectionName);
      }
    }
    throw new Error(`Section not found for sheetId ${sheetId}`);
  }
  varb<SN extends SectionName, VN extends VarbName<SN>>(
    sectionName: SN,
    varbName: VN,
  ): VarbSchema<SN, VN> {
    return new VarbSchema(sectionName, varbName);
  }
  isInSnGroup<GN extends SnGroupName>(
    groupName: GN,
    sectionName: string,
  ): sectionName is GroupSectionName<GN> {
    return isInSnGroup(groupName, sectionName);
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
  makeSectionIds(): {
    fullId: string;
    baseId: string;
    fullIdFormula: string;
  } {
    const baseId = utils.id.makeBase();
    return {
      baseId,
      fullId: `${this.attributes.idPrepend}-${baseId}`,
      fullIdFormula: utils.id.makeFormula(this.attributes.idPrepend),
    };
  }
  get varbNames(): VarbName<SN>[] {
    return Obj.keys(this.allVarbAttributes[this.sectionName]);
  }
  makeDefaultValues<VN extends VarbNameMutable<SN>>(
    varbNames: VN[] = Arr.exclude(this.varbNames, varbNameImmutable) as VN[],
  ): SectionValues<SN, VN> {
    return varbNames.reduce(
      (values, varbName) => {
        if (varbNameImmutable.includes(varbName as VarbNameImmutable)) {
          return values;
        } else {
          values[varbName] = this.varb(
            varbName,
          ).makeDefaultValue() as SectionValues<SN, VN>[typeof varbName];
        }
        return values;
      },
      {} as SectionValues<SN, VN>,
    );
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
  get valueAttributes(): VarbValueAttributes<SN, VN> {
    return this.allValueAttributes[
      this.valueName as ValueName
    ] as VarbValueAttributes<SN, VN>;
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
  get isEquationLiteral(): boolean {
    const valueAttributes = this.valueAttributes;
    const defaultValue = valueAttributes.makeDefault();
    if (typeof defaultValue === "string" && defaultValue.startsWith("=")) {
      return true;
    } else {
      return false;
    }
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
