// PROTOTYPE #114, throwaway. Variant 3: "#generated" resolves per program (tsconfig paths, rollup/vitest alias).
import { columnConfigs, sheetConfigs } from "#generated/configs";

type ValueOf<VN> = VN extends "number" ? number : VN extends "checkbox" ? boolean : string;
type ColumnConfigs = typeof columnConfigs;

export type SheetName = keyof ColumnConfigs & string;
export type ColumnName<SN extends SheetName> = SN extends SheetName ? keyof ColumnConfigs[SN] & string : never;
export type ColumnValue<SN extends SheetName, CN extends ColumnName<SN>> = SN extends SheetName
  ? CN extends keyof ColumnConfigs[SN]
    ? ValueOf<ColumnConfigs[SN][CN]["valueName" & keyof ColumnConfigs[SN][CN]]>
    : never
  : never;

export function header(sheetName: SheetName, col: string): string {
  const cols: Record<string, { header: string }> = columnConfigs[sheetName];
  return cols[col]!.header;
}
// Module-level derivation still works, as today (sheetConfigsTypes.ts:30).
const byGid = new Map<number, SheetName>(
  Object.entries(sheetConfigs).map(([k, v]) => [v.sheetGid, k as SheetName]),
);
export function sheetNameByGid(gid: number): SheetName | undefined {
  return byGid.get(gid);
}
