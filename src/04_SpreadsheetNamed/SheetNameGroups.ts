import {
  configSheetNames,
  getSheetTraitByName,
  type SheetConfigs,
} from "../01_generatedConfigs/sheetConfigsTypes";
import { Arr } from "../utils/Arr";
import { type SubType } from "../utils/Obj";

export type SheetNameWithIdColumn = keyof SubType<
  SheetConfigs,
  { hasIdColumn: true }
>;

const sheetNameGroups = {
  hasIdColumn: configSheetNames.filter((sheetName) =>
    getSheetTraitByName(sheetName, "hasIdColumn"),
  ) as SheetNameWithIdColumn[],
  aggregateApi: Arr.extractStrict(
    configSheetNames,
    "addOccChargeOnetime",
    "addHhPaymentOnetime",
    "addExpenses",
  ),
  ledgerInputs: Arr.extractStrict(
    configSheetNames,
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
