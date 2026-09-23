import type {
  ColumnConfigsBase,
  SheetConfigsBase,
  ValueConfigsBase,
} from "./makeConfigs";
import type { UniformRowLayoutIndexes } from "./uniformRowLayout";

export interface ConfigSetBase {
  spreadsheetConfig: UniformRowLayoutIndexes & Record<string, string | number>;
  sheetConfigs: SheetConfigsBase;
  columnConfigs: ColumnConfigsBase;
  valueConfigs: ValueConfigsBase;
}

// Empty until the program augments it once with `configs: typeof appConfigs`.
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- declaration merging fills it
export interface Register {}

export interface ConfigsNotRegistered {
  "Augment Register with `configs: typeof appConfigs`": never;
}

export type ConfigsOf<RG> = RG extends {
  configs: infer CS extends ConfigSetBase;
}
  ? CS
  : ConfigsNotRegistered;

export type Configs = ConfigsOf<Register>;

let installed: Configs | null = null;

export function installConfigs(configs: Configs): void {
  installed = configs;
}

export function installedConfigs(): Configs {
  if (installed === null) {
    throw new Error(
      "Configs have not been installed. The entry call must supply the app's configs before anything reads them.",
    );
  }
  return installed;
}
