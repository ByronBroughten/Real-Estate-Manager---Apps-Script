import { enforceDict } from "./enforceSchema";
import { sectionNames, type SectionNameSimple } from "./sectionNames";

type VarbNamesBase = readonly ["ID", ...string[]];

const sectionVarbNames = enforceDict(
  sectionNames,
  ["ID"] as VarbNamesBase,
  {
    unit: ["ID"],
    household: ["ID"],
    householdChargeOnetime: [
      "ID",
      "Date",
      "Household ID",
      "Subsidy ID",
      "Expense ID",
      "Household name",
      "Portion",
      "Description",
      "Dollar amount",
      "Notes",
    ],
    addHouseholdChargeOnetime: [
      "ID",
      "Date",
      "Household name",
      "Currency amount",
      "Description",
      "Portion",
      "Notes",
    ],
  } as const
);

type SectionVarbNames = typeof sectionVarbNames;
type SectionVarbName = {
  [SN in SectionNameSimple]: SectionVarbNames[SN][number];
};

export type VarbName<SN extends SectionNameSimple = SectionNameSimple> =
  SectionVarbName[SN];
