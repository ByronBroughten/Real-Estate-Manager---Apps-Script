import { Obj } from "../utils/Obj";

export function makeStructuredConfig<const S extends unknown, T extends S>(
  _structure: S,
  t: T,
): T {
  return t;
}

const cellValues = {
  string: "" as string,
  number: 0 as number,
  date: 0 as number,
  boolean: false as boolean,
};

export const cellValueNames: CellValueName[] = Obj.keys(cellValues);
export type CellValueNameToValue = typeof cellValues;
export type CellValueName = keyof CellValueNameToValue;
export type CellValue<VN extends CellValueName = CellValueName> =
  CellValueNameToValue[VN];

export const nameDelimiter = "_";
export type NameDelimiter = typeof nameDelimiter;

const uniformRowValueNames = {
  header: "string",
  action: "boolean",
  columnId: "string",
  colGroupName: "string",
} as const;

type UniformRowValueNames = typeof uniformRowValueNames;
export type UniformRowName = keyof UniformRowValueNames;
export type UniformRowValueName<UN extends UniformRowName> =
  UniformRowValueNames[UN];

export type UniformRowValue<UN extends UniformRowName> = CellValue<
  UniformRowValueName<UN>
>;

export function getUniformRowValueName<UN extends UniformRowName>(
  name: UN,
): UniformRowValueName<UN> {
  return uniformRowValueNames[name];
}
