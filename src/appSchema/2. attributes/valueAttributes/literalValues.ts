import { Obj } from "../../../utils/Obj";
import { validationError } from "../../../utils/validation";
import type { ValueSchema } from "../allValueAttributes";

const literalValues = {
  hhNameFromId: `=ROW_MATCH(household[Name], household[ID],"Household ID")`,
};

export type LiteralValues = typeof literalValues;
type LiteralValueName = keyof LiteralValues;
type LiteralValueAttributesBase = {
  [K in LiteralValueName]: ValueSchema<K>;
};

export function makeLiteralValueSchemas(): LiteralValueAttributesBase {
  const result: { [K in LiteralValueName]: ValueSchema<K> } =
    {} as LiteralValueAttributesBase;
  (Obj.keys(literalValues) as LiteralValueName[]).forEach((name) => {
    result[name] = {
      makeDefault: () => literalValues[name],
      defaultValidate: (value: "unknown") => {
        if (value !== literalValues[name]) {
          throw validationError(value, `'${name}' literal value element.`);
        } else {
          return value;
        }
      },
    };
  });
  return result;
}

export type LiteralValueParamsDict = {
  [K in LiteralValueName]: {};
};
