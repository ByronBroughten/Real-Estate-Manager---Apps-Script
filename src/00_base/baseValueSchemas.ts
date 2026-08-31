import { Dat } from "../utils/Dat";
import { Val } from "../utils/Val";
import {
  cellValueNames,
  type CellValueName,
  type CellValueNameToValue,
} from "./base";
import { vsc, type ValueSchemaBase, type ValueSchemaKey } from "./valueSchema";

export const baseValueNames = ["id", ...cellValueNames] as const;
export type BaseValueName = (typeof baseValueNames)[number];
export function isBaseValueName(x: unknown): boolean {
  return baseValueNames.includes(x as BaseValueName);
}

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
    strictValidate: Val.validate.string,
  }),
  string: vsc({
    type: "" as string,
    makeDefault: () => "",
    strictValidate: Val.validate.string,
  }),
  number: vsc({
    type: 0 as number | "",
    makeDefault: () => "" as const,
    strictValidate: Val.validate.number,
  }),
  boolean: vsc({
    type: false as boolean | "",
    makeDefault: () => false,
    strictValidate: Val.validate.boolean,
  }),
  date: vsc({
    type: "" as number | "",
    makeDefault: () => Dat.dateToSerial(new Date()),
    strictValidate: Val.validate.number,
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
