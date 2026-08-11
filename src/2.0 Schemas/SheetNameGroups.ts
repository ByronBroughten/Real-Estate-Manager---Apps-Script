import { allsheetNames } from "../1.0 Configs/2.0 sheetConfigs";
import { Arr } from "../utils/Arr";

const sheetNameGroups = {
  aggregateApi: Arr.extractStrict(
    allsheetNames,
    "addOccChargeOnetime",
    "addHhPaymentOnetime",
    "addExpenses",
  ),
  ledgerInputs: Arr.extractStrict(
    allsheetNames,
    "occCharge",
    "occPayAllocation",
  ),
} as const;

type SheetNameGroups = typeof sheetNameGroups;
export type TnGroupName = keyof SheetNameGroups;

export type GroupToSheetName<GN extends TnGroupName> =
  SheetNameGroups[GN][number];

export function isInTnGroup<GN extends TnGroupName>(
  groupName: GN,
  sn: string,
): sn is GroupToSheetName<GN> {
  return (sheetNameGroups[groupName] as string[]).includes(sn);
}
