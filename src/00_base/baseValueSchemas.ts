import { Dat } from "../utils/Dat";
import { Val } from "../utils/Val";
import { cellValueNames, type CellValueNameToValue } from "./base";
import { vsc, type ValueSchemaBase } from "./valueSchema";

export const baseValueNames = ["id", "checkbox", ...cellValueNames] as const;
export type BaseValueName = (typeof baseValueNames)[number];
export function isBaseValueName(x: unknown): boolean {
  return baseValueNames.includes(x as BaseValueName);
}

export interface BaseValues extends CellValueNameToValue {
  id: string;
  checkbox: boolean;
}

// A declared checkbox column draws a box in every row, so it admits no blank.
type NeverBlankValueName = "checkbox";
export type BlankOf<VN extends string> = VN extends NeverBlankValueName
  ? never
  : "";

type BaseValuesOrEmpty = {
  [VN in BaseValueName]: BaseValues[VN] | BlankOf<VN>;
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
    blankReadsAs: null,
  }),
  checkbox: vsc({
    type: false as boolean,
    makeDefault: () => false,
    strictValidate: Val.validate.boolean,
    blankReadsAs: false,
  }),
  string: vsc({
    type: "" as string,
    makeDefault: () => "",
    strictValidate: Val.validate.string,
    blankReadsAs: null,
  }),
  number: vsc({
    type: 0 as number | "",
    makeDefault: () => "" as const,
    strictValidate: Val.validate.number,
    blankReadsAs: null,
  }),
  boolean: vsc({
    type: false as boolean | "",
    makeDefault: () => false,
    strictValidate: Val.validate.boolean,
    blankReadsAs: null,
  }),
  date: vsc({
    type: "" as number | "",
    makeDefault: () => Dat.dateToSerial(new Date()),
    strictValidate: Val.validate.number,
    blankReadsAs: null,
  }),
} as const;
