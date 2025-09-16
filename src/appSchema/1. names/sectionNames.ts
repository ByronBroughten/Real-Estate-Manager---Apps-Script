import { makeSchemaNames, type EnforceName } from "../makeSchema";

export const sectionNames = makeSchemaNames([
  "unit",
  "household",
  "householdChargeOnetime",
  "addHouseholdChargeOnetime",
] as const);

export type SectionNameSimple = EnforceName<typeof sectionNames>;
export type SectionName<S extends SectionNameSimple = SectionNameSimple> = S;
