// PROTOTYPE #114, throwaway: the framework's own program registers its fixture configs.
import * as fixture from "../../../fixtureConfigs";
import { registerConfigs } from "../configs";

declare module "../configs" {
  interface Register {
    configs: typeof fixture;
  }
}
registerConfigs(fixture);
