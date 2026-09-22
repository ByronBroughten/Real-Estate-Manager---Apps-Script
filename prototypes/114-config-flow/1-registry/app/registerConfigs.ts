// PROTOTYPE #114, throwaway: the app's one augmentation, through the public entry.
import { sheetConfigs } from "../../realConfigs/sheetConfigs";
import { columnConfigs } from "../../realConfigs/columnConfigs";
import { registerConfigs } from "../framework/index";

const appConfigs = { sheetConfigs, columnConfigs };
declare module "../framework/index" {
  interface Register {
    configs: typeof appConfigs;
  }
}
registerConfigs(appConfigs);
