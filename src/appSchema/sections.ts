import { enforceDict } from "./enforceSchema";
import { sectionNames, type SectionNameSimple } from "./sectionNames";

type SectionBase = {
  sectionName: SectionNameSimple;
  sheetId: string;
  idPrepend: string;
};

type SectionProp<
  SN extends SectionNameSimple,
  IP extends string,
  SI extends string
> = Record<
  SN,
  {
    sectionName: SN;
    idPrepend: IP;
    sheetId: SI;
  }
>;

function makeSectionProp<
  SN extends SectionNameSimple,
  IP extends string,
  SI extends string
>(sectionName: SN, idPrepend: IP, sheetId: SI): SectionProp<SN, IP, SI> {
  return {
    [sectionName]: { sectionName, idPrepend, sheetId },
  } as SectionProp<SN, IP, SI>;
}

const msp = makeSectionProp;

export const sections = enforceDict(sectionNames, {} as SectionBase, {
  ...msp("unit", "p", ""),
  ...msp("household", "h", ""),
  ...msp("householdChargeOnetime", "hco", ""),
  ...msp("addHouseholdChargeOnetime", "ahco", ""),
});

export type Sections = typeof sections;
