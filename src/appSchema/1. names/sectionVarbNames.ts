import { makeSchemaDict } from "../makeSchema";
import { sectionNames, type SectionNameSimple } from "./sectionNames";

type VarbNamesBase = readonly ["id", ...string[]];

const sectionVarbNames = makeSchemaDict(
  sectionNames,
  ["id"] as VarbNamesBase,
  {
    unit: ["id"],
    household: ["id"],
    expense: ["id"],
    subsidy: ["id"],
    hhChargeOnetime: [
      "id",
      "date",
      "householdId",
      "subsidyId",
      "expenseId",
      "portion",
      "description",
      "amount",
      "notes",
    ],
    addHhChargeOnetime: [
      "id",
      "date",
      "householdName",
      "amount",
      "description",
      "portion",
      "notes",
    ],
  } as const
);

type SectionVarbNames = typeof sectionVarbNames;
type SectionVarbName = {
  [SN in SectionNameSimple]: SectionVarbNames[SN][number];
};

export type VarbName<SN extends SectionNameSimple = SectionNameSimple> =
  SectionVarbName[SN];
