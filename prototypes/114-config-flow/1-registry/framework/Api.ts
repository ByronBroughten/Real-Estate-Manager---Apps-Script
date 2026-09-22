// PROTOTYPE #114, throwaway: tier 06, dispatch by the edited sheet's gid.
import { sheetNameByGid, type SheetName } from "./configs";
import { SheetNamed } from "./SheetNamed";

export type Endpoint = (api: Api) => void;
export type Endpoints = { [SN in SheetName]?: Endpoint };

export class Api {
  constructor(
    readonly endpoints: Endpoints,
    private readonly store: Record<string, Record<string, unknown>[]>,
  ) {}
  sheet<SN extends SheetName>(sheetName: SN): SheetNamed<SN> {
    return new SheetNamed(sheetName, (this.store[sheetName] ??= [{}]));
  }
  onEdit(sheetGid: number): void {
    const sheetName = sheetNameByGid(sheetGid);
    console.log(`  onEdit(gid ${sheetGid}) -> endpoint ${sheetName ?? "(none)"}`);
    if (sheetName) this.endpoints[sheetName]?.(this);
  }
}
