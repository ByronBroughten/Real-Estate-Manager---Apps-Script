import { eslintPreset, variableNaming } from "@byronbroughten/config/eslint";
import { appEslintPreset } from "@byronbroughten/sheets-framework/eslint";
import { defineConfig } from "eslint/config";

export default defineConfig(
  ...eslintPreset,
  ...appEslintPreset({ testSetupFiles: ["src/installAppConfigs.ts"] }),
  // Domain-free utilities keep bare T, K and V.
  {
    files: ["src/appUtils/**/*.ts"],
    rules: {
      "@typescript-eslint/naming-convention": ["error", variableNaming],
    },
  },
);
