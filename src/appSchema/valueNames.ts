import { enforceNames, type EnforceName } from "./enforceSchema";

export const valueNames = enforceNames([
  "id",
  "string",
  "number",
  "boolean",
  "date",
] as const);

export type ValueNameSimple = EnforceName<typeof valueNames>;
export type ValueName<V extends ValueNameSimple = ValueNameSimple> = V;
