import { makeSchemaNames, type EnforceName } from "../makeSchema";

export const valueNames = makeSchemaNames([
  "id",
  "string",
  "number",
  "boolean",
  "date",
] as const);

export type ValueNameSimple = EnforceName<typeof valueNames>;
export type ValueName<V extends ValueNameSimple = ValueNameSimple> = V;
