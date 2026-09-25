import { eslintPreset } from "@byronbroughten/config/eslint";
import { appEslintPreset } from "@byronbroughten/sheets-framework/eslint";
import { defineConfig } from "eslint/config";

export default defineConfig(
  ...eslintPreset,
  ...appEslintPreset({ testSetupFiles: ["src/installAppConfigs.ts"] }),
);
