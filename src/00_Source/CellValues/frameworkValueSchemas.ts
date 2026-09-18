import { Dat, type DateSerial } from "../../utils/Dat";
import { Val } from "../../utils/Val";
import { cellValueNames, type CellValueNameToValue } from "./cellValues";
import { vsc, type ValueSchemaBase } from "./valueSchema";

export const frameworkValueNames = [
  "id",
  "checkbox",
  ...cellValueNames,
] as const;
export type FrameworkValueName = (typeof frameworkValueNames)[number];
export function isFrameworkValueName(x: unknown): boolean {
  return frameworkValueNames.includes(x as FrameworkValueName);
}

export interface FrameworkValues extends CellValueNameToValue {
  id: string;
  checkbox: boolean;
  date: DateSerial;
}

// A declared checkbox column draws a box in every row, so it admits no blank.
type NeverBlankValueName = "checkbox";
export type BlankOf<VN extends string> = VN extends NeverBlankValueName
  ? never
  : "";

type FrameworkValuesOrEmpty = {
  [VN in FrameworkValueName]: FrameworkValues[VN] | BlankOf<VN>;
};

export type CellValueSchemas = {
  [VN in FrameworkValueName]: ValueSchemaBase<FrameworkValuesOrEmpty[VN]>;
};

export const frameworkValueSchemas: CellValueSchemas = {
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
    type: "" as DateSerial | "",
    makeDefault: () => Dat.today(),
    strictValidate: Val.validate.date,
    blankReadsAs: null,
  }),
} as const;
