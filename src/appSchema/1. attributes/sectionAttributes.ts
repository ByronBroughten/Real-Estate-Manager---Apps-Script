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
    hhChargeOnetime: ma("hhc", 825934775),
    addHhChargeOnetime: ma("ahhc", 1202471195),
    hhTransactionOngoing: ma("hto", 194710324),
    unit: ma("un", 321313883),
    household: ma("hh", 0),
    expense: ma("ex", 449009036),
    subsidyProgram: ma("sp", 332858329),
  } as const
);

export const sectionNames = Obj.keys(allSectionAttributes);
export type SectionNameSimple = MakeSchemaName<typeof sectionNames>;

export type AllSectionAttributes = typeof allSectionAttributes;

export type SectionAttributes<SN extends SectionNameSimple> =
  AllSectionAttributes[SN];

export type SectionName<S extends SectionNameSimple = SectionNameSimple> = S;

export const apiSectionNames = Arr.extractStrict(sectionNames, [
  "addHhChargeOnetime",
] as const);

export type ApiSectionName = (typeof apiSectionNames)[number];

export function isApiSectionName(s: string): s is ApiSectionName {
  return apiSectionNames.includes(s as ApiSectionName);
}
