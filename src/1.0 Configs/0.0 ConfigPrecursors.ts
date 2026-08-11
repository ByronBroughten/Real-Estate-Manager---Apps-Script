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
  boolean: false as boolean,
  date: new Date() as Date,
};

export const cellValueNames: CellValueName[] = Obj.keys(cellValues);
type CellValues = typeof cellValues;
type CellValueName = keyof CellValues;
export type CellValue = CellValues[CellValueName];
