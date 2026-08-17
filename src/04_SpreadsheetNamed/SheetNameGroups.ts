import type { SheetTraits } from "../02_generatedTraits/02_sheetTraitsTypes";
import {
  getSheetTraitByName,
  schemaSheetNames,
} from "../02_generatedTraits/02_sheetTraitsTypes";
import { Arr } from "../utils/Arr";
import { type SubType } from "../utils/Obj";

export type SheetNameWithIdColumn = keyof SubType<
  SheetTraits,
  { hasIdColumn: true }
>;

const sheetNameGroups = {
  hasIdColumn: schemaSheetNames.filter((sheetName) =>
    getSheetTraitByName(sheetName, "hasIdColumn"),
  ) as SheetNameWithIdColumn[],
  aggregateApi: Arr.extractStrict(
    schemaSheetNames,
    "addOccChargeOnetime",
    "addHhPaymentOnetime",
    "addExpenses",
  ),
  ledgerInputs: Arr.extractStrict(
    schemaSheetNames,
    "occCharge",
    "occPayAllocation",
  ),
} as const;

type SheetNameGroups = typeof sheetNameGroups;
export type TnGroupName = keyof SheetNameGroups;

export type SheetNameByGroup<GN extends TnGroupName> =
  SheetNameGroups[GN][number];

export function isInTnGroup<GN extends TnGroupName>(
  groupName: GN,
  sn: string,
): sn is SheetNameByGroup<GN> {
  return (sheetNameGroups[groupName] as string[]).includes(sn);
}
