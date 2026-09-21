import {
  getColumnTraitByName,
  getSheetColumnNames,
  type ColumnName,
} from "../../01_SpreadsheetSchema/columnConfigsTypes";
import { configSheetFloorSeed } from "../../01_SpreadsheetSchema/configSheetFloorSeed";
import { Obj } from "../../utils/Obj";

export type FloorTabName = keyof typeof configSheetFloorSeed;
export type FloorSheetName = Exclude<FloorTabName, "valueConfig">;

export function columnNameByHeader<SN extends FloorSheetName>(
  sheetName: SN,
  header: string,
): ColumnName<SN> {
  const columnName = getSheetColumnNames(sheetName).find(
    (name) => getColumnTraitByName(sheetName, name, "header") === header,
  );
  if (columnName === undefined) {
    throw new Error(
      `Floor seed header ${JSON.stringify(header)} is not a column on ${sheetName}.`,
    );
  }
  return columnName;
}

export function floorSheetNames(): FloorSheetName[] {
  return Obj.keys(configSheetFloorSeed).filter(
    (sheetName): sheetName is FloorSheetName =>
      configSheetFloorSeed[sheetName].columns.length > 0,
  );
}
