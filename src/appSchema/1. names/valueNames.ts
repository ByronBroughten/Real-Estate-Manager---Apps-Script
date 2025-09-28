import { makeSchemaNames, type MakeSchemaName } from "../makeSchema";

export const valueNames = makeSchemaNames([
  "id",
  "linkedId",
  "string",
  "number",
  "boolean",
  "date",
  "rentPortionName",
] as const);

export type ValueNameSimple = MakeSchemaName<typeof valueNames>;
export type ValueName<V extends ValueNameSimple = ValueNameSimple> = V;
