import type { SectionNameSimple } from "./sectionNames";

type SectionVarbBase = {};

type SectionVarbsBase = {
  [S in SectionNameSimple]: Record<string, SectionVarbBase>;
};

const valueNames = ["ID", "string", "number", "boolean"] as const;

const chargeOnetimeSchema = {
  Date: {
    type: "date",
  },
  ID: {
    // create
    type: "string",
  },
  "Household ID": {
    type: "string",
  },
  "Subsidy ID": {
    // only needed if the portion is "subsidy"
    // can be obtained by most recent subsidy on recurring charges
    type: "string",
  },
  "Expense ID": {
    // optional
    type: "string",
  },
  "Household name": {
    // household[Name]
    type: "formula",
    value: "=FILTER(household[Name], household[ID]=$ColletterRownum)",
  },
  Portion: {
    type: "string",
  },
  Description: {
    type: "string",
  },
  "Dollar amount": {
    type: "number",
  },
  Notes: {
    type: "string",
  },
};

export const sectionVarbs = enforceBase({
  unit: {
    ID: { type: "string" },
  },
  household: {
    ID: { type: "string" },
  },
  householdChargeOnetime: {
    Date: {
      type: "date",
    },
    ID: {
      // create
      type: "string",
    },
    "Household ID": {
      type: "string",
    },
    "Subsidy ID": {
      // only needed if the portion is "subsidy"
      // can be obtained by most recent subsidy on recurring charges
      type: "string",
    },
    "Expense ID": {
      // optional
      type: "string",
    },
    "Household name": {
      // household[Name]
      type: "formula",
      value: "=FILTER(household[Name], household[ID]=$ColletterRownum)",
    },
    Portion: {
      type: "string",
    },
    Description: {
      type: "string",
    },
    "Dollar amount": {
      type: "number",
    },
    Notes: {
      type: "string",
    },
  },
  addHouseholdChargeOnetime: {
    Date: {
      type: "date",
      resetValue: "=TODAY()",
    },
    "Household name": {
      type: "string", //household.Name
    },
    "Currency amount": {
      type: "number",
    },
    Description: {
      type: "string",
    },
    Portion: {
      type: "string", // nrHouseholdPortion
      resetValue: "Household",
    },
    Notes: {
      type: "string",
    },
  },
  addHouseholdChargeRecurring: {},
});

function enforceBase<T extends SectionVarbsBase>(t: T): T {
  return t;
}
