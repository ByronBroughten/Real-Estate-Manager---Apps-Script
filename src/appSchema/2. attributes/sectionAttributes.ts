import { sectionNames } from "../1. names/sectionNames";
import { makeSchemaDict } from "../makeSchema";

type SectionBase = {
  sheetId: string;
  idPrepend: string;
};

type Section<IP extends string, SI extends string> = {
  idPrepend: IP;
  sheetId: SI;
};

function makeAttributes<IP extends string, SI extends string>(
  idPrepend: IP,
  sheetId: SI
): Section<IP, SI> {
  return { idPrepend, sheetId } as Section<IP, SI>;
}

const ma = makeAttributes;

export const sections = makeSchemaDict(sectionNames, {} as SectionBase, {
  unit: ma("un", ""),
  household: ma("h", ""),
  householdChargeOnetime: ma("hco", ""),
  addHouseholdChargeOnetime: ma("ahco", ""),
});

export type Sections = typeof sections;
