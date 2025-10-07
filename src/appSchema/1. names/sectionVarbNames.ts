import { makeSchemaDict } from "../makeSchema";
import { sectionNames, type SectionNameSimple } from "./sectionNames";

type VarbNamesBase = readonly ["id", ...string[]];

const sectionVarbNames = makeSchemaDict(
  sectionNames,
  ["id"] as VarbNamesBase,
  {
    unit: ["id"],
    test: ["id", "dateCurrent", "dateNext", "priceCurrent", "priceNext"],
    household: [
      "id",
      "rentIncreaseDateLast",
      "rentIncreaseDateNext",
      "rentChargeMonthly",
      "rentChargeMonthlyNext",
      "subsidyPortionMonthly",
      "subsidyPortionChangeDate",
      "subsidyPortionMonthlyNext",
    ],
    expense: ["id"],
    subsidyProgram: ["id"],
    hhChargeOnetime: [
      "id",
      "date",
      "householdId",
      "expenseId",
      "description",
      "amount",
      "notes",
    ],
    addHhChargeOnetime: [
      "id",
      "date",
      "householdName",
      "householdId",
      "expenseId",
      "amount",
      "description",
      "notes",
      "enter",
    ],
  } as const
);

type SectionVarbNames = typeof sectionVarbNames;
type SectionToVarbName = {
  [SN in SectionNameSimple]: SectionVarbNames[SN][number];
};

export type VarbNameWide<SN extends SectionNameSimple = SectionNameSimple> =
  SectionToVarbName[SN];
