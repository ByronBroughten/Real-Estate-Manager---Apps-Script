import { enforceNames, type EnforceName } from "./enforceSchema";

export const sectionNames = enforceNames([
  "unit",
  "household",
  "householdChargeOnetime",
  "addHouseholdChargeOnetime",
] as const);

export type SectionNameSimple = EnforceName<typeof sectionNames>;
export type SectionName<S extends SectionNameSimple = SectionNameSimple> = S;
