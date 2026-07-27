import { utils } from "../../utilitiesGeneral";
import { valS } from "../../utils/validation";
import { makeSchemaStructure } from "./0.1 makeSchema";
import type { ValueNameSimple } from "./2. valueNames";
import { va, type ValueAttributesBase } from "./3.0 valueAttribute";
import { makeValidationValueSchemas } from "./3.1 validationLists";

type AllValueAttributesBase = Record<ValueNameSimple, ValueAttributesBase>;
const allValueAttributes = makeSchemaStructure(
  {} as AllValueAttributesBase,
  {
    baseId: va({
      type: "" as string,
      makeDefault: () => utils.id.makeBase(),
      defaultValidate: valS.validate.string,
    }),
    string: va({
      type: "" as string,
      makeDefault: () => "",
      defaultValidate: valS.validate.string,
    }),
    number: va({
      type: "" as number | string,
      makeDefault: () => "",
      defaultValidate: valS.validate.numberOrEmpty,
    }),
    boolean: va({
      type: "" as boolean | string,
      makeDefault: () => false,
      defaultValidate: valS.validate.boolean,
    }),
    date: va({
      type: "" as Date | string,
      makeDefault: () => new Date(),
      defaultValidate: valS.validate.dateOrEmptyOrFormula,
    }),
    ...makeValidationValueSchemas(),
  } as const,
); // I could add a "noEmpty" column to certain values.

export type AllValueAttributes = typeof allValueAttributes;
export type ValueName<V extends ValueNameSimple = ValueNameSimple> = V;
export type ValueAttributes<VN extends ValueName = ValueName> =
  AllValueAttributes[VN];

export function getValueAttribute<
  VN extends ValueNameSimple,
  K extends keyof ValueAttributes<VN>,
>(valueName: VN, key: K): ValueAttributes<VN>[K] {
  return allValueAttributes[valueName][key];
}

export type Value<VN extends ValueName = ValueName> =
  ValueAttributes<VN>["type"];

export type MakeDefaultValue<VN extends ValueName> = () => Value<VN>;
export type ValidateValue<VN extends ValueName> = (value: unknown) => Value<VN>;
