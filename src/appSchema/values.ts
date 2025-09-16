import { enforceDict } from "./enforceSchema";
import { valueNames } from "./valueNames";

type ValueBase = {
  type: any;
};

export const values = enforceDict(valueNames, {} as ValueBase, {
  id: {
    type: "" as string,
  },
  string: {
    type: "" as string,
  },
  number: {
    type: 0 as number,
  },
  boolean: {
    type: false as boolean,
  },
  date: {
    type: new Date() as Date,
  },
});
