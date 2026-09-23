import {
  configSheetNames,
  getSheetTraitByName,
  type SheetConfigs,
} from "../01_SpreadsheetSchema/sheetConfigsTypes";
import { lazy } from "../utils/lazy";
import { type SubType } from "../utils/Obj";

export type SheetNameWithIdColumn = keyof SubType<
  SheetConfigs,
  { hasIdColumn: true }
>;

const sheetNameGroups = lazy(
  () =>
    ({
      hasIdColumn: configSheetNames().filter((sheetName) =>
        getSheetTraitByName(sheetName, "hasIdColumn"),
      ) as SheetNameWithIdColumn[],
    }) as const,
);

type SheetNameGroups = ReturnType<typeof sheetNameGroups>;
export type TnGroupName = keyof SheetNameGroups;

export type SheetNameByGroup<GN extends TnGroupName> =
  SheetNameGroups[GN][number];

export function isInTnGroup<GN extends TnGroupName>(
  groupName: GN,
  sn: string,
): sn is SheetNameByGroup<GN> {
  return (sheetNameGroups()[groupName] as string[]).includes(sn);
}
