// PROTOTYPE #114, throwaway: the app pins C once and re-exports shorter names.
import { sheetConfigs } from "../../realConfigs/sheetConfigs";
import { columnConfigs } from "../../realConfigs/columnConfigs";
import type * as F from "../framework/index";

export const appConfigs = { sheetConfigs, columnConfigs };
export type AppConfigs = typeof appConfigs;
export type SheetName = F.SheetName<AppConfigs>;
export type ColumnName<SN extends SheetName> = F.ColumnName<AppConfigs, SN>;
export type ColumnValue<SN extends SheetName, CN extends ColumnName<SN>> = F.ColumnValue<AppConfigs, SN, CN>;
export type SheetNamed<SN extends SheetName> = F.SheetNamed<AppConfigs, SN>;
export type Endpoints = F.Endpoints<AppConfigs>;
