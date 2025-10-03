import { makeSchemaNames, type MakeSchemaName } from "../makeSchema";

export const sectionNames = makeSchemaNames([
  "test",
  "unit",
  "household",
  "expense",
  "subsidyProgram",
  "hhChargeOnetime",
  "addHhChargeOnetime",
] as const);

export type SectionNameSimple = MakeSchemaName<typeof sectionNames>;
export type SectionName<S extends SectionNameSimple = SectionNameSimple> = S;
