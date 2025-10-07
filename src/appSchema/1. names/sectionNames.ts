import { Arr } from "../../utils/Arr";
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

export const apiSectionNames = Arr.extractStrict(sectionNames, [
  "addHhChargeOnetime",
] as const);

export type ApiSectionName = (typeof apiSectionNames)[number];

export function isApiSectionName(s: string): s is ApiSectionName {
  return apiSectionNames.includes(s as ApiSectionName);
}
