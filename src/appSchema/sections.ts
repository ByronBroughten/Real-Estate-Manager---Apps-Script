import { enforceDict } from "./enforceSchema";
import { sectionNames } from "./sectionNames";

type SectionBase = {
  sheetId: string;
  idPrepend: string;
};

type Section<IP extends string, SI extends string> = {
  idPrepend: IP;
  sheetId: SI;
};

function makeSection<IP extends string, SI extends string>(
  idPrepend: IP,
  sheetId: SI
): Section<IP, SI> {
  return { idPrepend, sheetId } as Section<IP, SI>;
}

const ms = makeSection;

export const sections = enforceDict(sectionNames, {} as SectionBase, {
  unit: ms("un", ""),
  household: ms("h", ""),
  householdChargeOnetime: ms("hco", ""),
  addHouseholdChargeOnetime: ms("ahco", ""),
});

export type Sections = typeof sections;
