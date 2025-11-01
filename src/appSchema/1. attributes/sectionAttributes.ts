import { Arr } from "../../utils/Arr";
import { Obj } from "../../utils/Obj";
import { makeSchemaStructure, type MakeSchemaName } from "../makeSchema";

type SectionAttributesBase = {
  idPrepend: string;
  sheetId: number;
};

type AllSectionAttributesBase = Record<string, SectionAttributesBase>;

type Section<IP extends string, SI extends number> = {
  idPrepend: IP;
  sheetId: SI;
};

function makeAttributes<IP extends string, SI extends number>(
  idPrepend: IP,
  sheetId: SI
): Section<IP, SI> {
  return { idPrepend, sheetId } as Section<IP, SI>;
}

const ma = makeAttributes;

export const allSectionAttributes = makeSchemaStructure(
  {} as AllSectionAttributesBase,
  {
    test: ma("tst", 2089200354),
    hhLedger: ma("hl", 731807482),
    buildHhLedger: ma("bhl", 706564734),
    hhChargeOngoing: ma("hto", 194710324),
    hhCharge: ma("hhc", 825934775),
    addHhChargeOnetime: ma("ahhc", 1202471195),
    hhPayment: ma("hhp", 1544131100),
    hhPaymentAllocation: ma("hpa", 348639454),
    addHhPaymentOnetime: ma("ahhp", 1485718763),
    paymentGroup: ma("pg", 939656506),
    unit: ma("un", 321313883),
    household: ma("hh", 0),
    expense: ma("ex", 449009036),
    subsidyProgram: ma("sp", 332858329),
    subsidyContract: ma("sc", 1155067179),
    hhPet: ma("hp", 560379920),
    otherPayer: ma("op", 471889863),
  } as const
);

export const sectionNames = Obj.keys(allSectionAttributes);
export type SectionNameSimple = MakeSchemaName<typeof sectionNames>;

export type AllSectionAttributes = typeof allSectionAttributes;

export type SectionAttributes<SN extends SectionNameSimple> =
  AllSectionAttributes[SN];

export type SectionName<S extends SectionNameSimple = SectionNameSimple> = S;

const sectionNameGroups = {
  api: Arr.extractStrict(sectionNames, [
    "addHhChargeOnetime",
    "buildHhLedger",
    "addHhPaymentOnetime",
  ] as const),
};

type SectionNameGroups = typeof sectionNameGroups;
export type SnGroupName = keyof SectionNameGroups;

export type GroupSectionName<GN extends SnGroupName> =
  SectionNameGroups[GN][number];

export function isInSnGroup<GN extends SnGroupName>(
  groupName: GN,
  sn: string
): sn is GroupSectionName<GN> {
  return sectionNameGroups[groupName].includes(sn as GroupSectionName<GN>);
}
