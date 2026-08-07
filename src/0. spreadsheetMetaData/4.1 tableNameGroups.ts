import { Arr } from "../utils/Arr";
import { allsheetNames } from "./4.0 tableAttributes";

const tableNameGroups = {
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

type TableNameGroups = typeof tableNameGroups;
export type TnGroupName = keyof TableNameGroups;

export type GroupToTableName<GN extends TnGroupName> =
  TableNameGroups[GN][number];

export function isInTnGroup<GN extends TnGroupName>(
  groupName: GN,
  sn: string,
): sn is GroupToTableName<GN> {
  return (tableNameGroups[groupName] as string[]).includes(sn);
}
