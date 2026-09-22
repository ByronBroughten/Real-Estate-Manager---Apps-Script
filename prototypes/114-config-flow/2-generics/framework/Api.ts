// PROTOTYPE #114, throwaway: tier 06 becomes Api<C>.
import type { ConfigSetBase, SheetName } from "./configs";
import { SheetNamed } from "./SheetNamed";

export type Endpoint<C extends ConfigSetBase> = (api: Api<C>) => void;
export type Endpoints<C extends ConfigSetBase> = { [SN in SheetName<C>]?: Endpoint<C> };

export class Api<C extends ConfigSetBase> {
  constructor(
    readonly configs: C,
    readonly endpoints: Endpoints<C>,
    private readonly store: Record<string, Record<string, unknown>[]>,
  ) {}
  sheet<SN extends SheetName<C>>(sheetName: SN): SheetNamed<C, SN> {
    return new SheetNamed(this.configs, sheetName, (this.store[sheetName] ??= [{}]));
  }
  onEdit(sheetGid: number): void {
    const sheetConfigs: ConfigSetBase["sheetConfigs"] = this.configs.sheetConfigs;
    const sheetName = Object.keys(sheetConfigs).find((k) => sheetConfigs[k]!.sheetGid === sheetGid) as
      | SheetName<C>
      | undefined;
    console.log(`  onEdit(gid ${sheetGid}) -> endpoint ${sheetName ?? "(none)"}`);
    if (sheetName) this.endpoints[sheetName]?.(this);
  }
}
