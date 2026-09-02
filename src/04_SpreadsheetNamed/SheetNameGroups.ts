import {
  getSheetColumnNames,
  type RunnerStem,
} from "../01_generatedConfigs/columnConfigsTypes";
import {
  configSheetNames,
  getSheetTraitByName,
  type SheetConfigs,
  type SheetNameSimple,
} from "../01_generatedConfigs/sheetConfigsTypes";
import { ssConfigGet } from "../01_generatedConfigs/spreadsheetConfigTypes";
import { Arr } from "../utils/Arr";
import { type SubType } from "../utils/Obj";
import { Str } from "../utils/Str";

export type SheetNameWithIdColumn = keyof SubType<
  SheetConfigs,
  { hasIdColumn: true }
>;

export type SheetNameWithRunnerColumns = {
  [SN in SheetNameSimple]: [RunnerStem<SN>] extends [never] ? never : SN;
}[SheetNameSimple];

function hasRunnerColumns(sheetName: SheetNameSimple): boolean {
  const columnNames: string[] = getSheetColumnNames(sheetName);
  return columnNames.some((columnName) => {
    const stem = Str.stemWithSuffix(
      columnName,
      ssConfigGet("runnerEndpointSuffix"),
    );
    return (
      stem !== null &&
      columnNames.includes(
        `${stem}${ssConfigGet("runSucceededEndpointSuffix")}`,
      ) &&
      columnNames.includes(
        `${stem}${ssConfigGet("errorMessageEndpointSuffix")}`,
      )
    );
  });
}

const sheetNameGroups = {
  hasIdColumn: configSheetNames.filter((sheetName) =>
    getSheetTraitByName(sheetName, "hasIdColumn"),
  ) as SheetNameWithIdColumn[],
  hasRunnerColumns: configSheetNames.filter(
    hasRunnerColumns,
  ) as SheetNameWithRunnerColumns[],
  aggregateApi: Arr.extractStrict(
    configSheetNames,
    "addOccChargesOnetime",
    "addOccPaymentsOnetime",
    "addPropertyExpenses",
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
