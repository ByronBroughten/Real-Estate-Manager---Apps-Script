import {
  cellValueNames,
  type CellValueName,
  type CellValueNameToValue,
} from "../00_traitPrecursors/base";
import { Dat } from "../utils/Dat";
import { valS } from "../utils/validation";
import {
  vsc,
  type ValueSchemaBase,
  type ValueSchemaKey,
} from "./03_valueSchema";

export const baseValueNames = ["id", ...cellValueNames] as const;
export type BaseValueName = (typeof baseValueNames)[number];

interface BaseValues extends CellValueNameToValue {
  id: string;
}
type BaseValuesOrEmpty = {
  [VN in BaseValueName]: BaseValues[VN] | "";
};

export type CellValueSchemas = {
  [VN in BaseValueName]: ValueSchemaBase<BaseValuesOrEmpty[VN]>;
};

export const baseValueSchemas: CellValueSchemas = {
  id: vsc({
    type: "" as string,
    makeDefault: () => {
      throw new Error(
        "Attempted to make default value for an ID column from valTraits; it should be generated with a provided id prefix.",
      );
    },
    strictValidate: valS.validate.string,
  }),
  string: vsc({
    type: "" as string,
    makeDefault: () => "",
    strictValidate: valS.validate.string,
  }),
  number: vsc({
    type: 0 as number | "",
    makeDefault: () => "" as const,
    strictValidate: valS.validate.number,
  }),
  boolean: vsc({
    type: false as boolean | "",
    makeDefault: () => false,
    strictValidate: valS.validate.boolean,
  }),
  date: vsc({
    type: "" as number | "",
    makeDefault: () => Dat.dateToSerial(new Date()),
    strictValidate: valS.validate.number,
  }),
} as const;

export type CellValueSchema<VN extends CellValueName = CellValueName> =
  CellValueSchemas[VN];
export type CellValueTrait<
  VN extends CellValueName,
  K extends ValueSchemaKey,
> = CellValueSchema<VN>[K];

export function getCellValTrait<
  VN extends CellValueName,
  K extends ValueSchemaKey,
>(valueName: VN, key: K): CellValueTrait<VN, K> {
  return baseValueSchemas[valueName][key] as CellValueTrait<VN, K>;
}
