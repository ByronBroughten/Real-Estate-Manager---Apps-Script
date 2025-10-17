import { Obj } from "../../../utils/Obj";
import { validationError } from "../../../utils/validation";
import { va, type ValueSchema } from "../valueAttributes";

const literalValues = {
  hhNameFromId: `=ROW_MATCH(household[Name], household[ID],"Household ID")`,
};

export type LiteralValues = typeof literalValues;
type LiteralValueName = keyof LiteralValues;

type LiteralValue<LN extends LiteralValueName> = LiteralValues[LN];

type LiteralValueAttributesBase = {
  [K in LiteralValueName]: ValueSchema<LiteralValue<K>>;
};

export function makeLiteralValueSchemas(): LiteralValueAttributesBase {
  return Obj.keys(literalValues).reduce((attributes, name) => {
    attributes[name] = va({
      type: literalValues[name] as LiteralValue<typeof name>,
      makeDefault: () => literalValues[name],
      defaultValidate: (value: unknown) => {
        if (value !== literalValues[name]) {
          throw validationError(value, `'${name}' literal value element.`);
        } else {
          return value;
        }
      },
    });
    return attributes;
  }, {} as LiteralValueAttributesBase);
}

export type LiteralValueParamsDict = {
  [K in LiteralValueName]: {};
};
