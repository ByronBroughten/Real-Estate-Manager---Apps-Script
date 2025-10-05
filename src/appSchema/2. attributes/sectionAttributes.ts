import { sectionNames, type SectionNameSimple } from "../1. names/sectionNames";
import { makeSchemaDict } from "../makeSchema";

type SectionBase = {
  idPrepend: string;
  sheetId: number;
};

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

export const allSectionAttributes = makeSchemaDict(
  sectionNames,
  {} as SectionBase,
  {
    test: ma("tst", 2089200354),
    unit: ma("un", 321313883),
    household: ma("hh", 0),
    expense: ma("ex", 449009036),
    subsidyProgram: ma("sp", 332858329),
    hhChargeOnetime: ma("hco", 825934775),
    addHhChargeOnetime: ma("ahco", 1202471195),
  } as const
);

export type AllSectionAttributes = typeof allSectionAttributes;

export type SectionAttributes<SN extends SectionNameSimple> =
  AllSectionAttributes[SN];
