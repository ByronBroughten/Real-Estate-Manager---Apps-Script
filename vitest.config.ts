import { defineConfig } from "vitest/config";

// Mirrors tsconfig.framework.json: these tests run on the dev configs, the rest of src/ on the app's.
const frameworkTests = [
  "src/00_Source/**/*.test.ts",
  "src/01_SpreadsheetSchema/**/*.test.ts",
  "src/02_SpreadsheetRaw/**/*.test.ts",
  "src/03_SpreadsheetIdentified/**/*.test.ts",
  "src/utils/**/*.test.ts",
];

export default defineConfig({
  test: {
    environment: "node",
    restoreMocks: true,
    unstubGlobals: true,
    projects: [
      {
        extends: true,
        test: {
          name: "framework",
          include: frameworkTests,
          setupFiles: ["dev/installDevConfigs.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "real-estate",
          include: ["src/**/*.test.ts"],
          exclude: frameworkTests,
          setupFiles: ["src/testSupport/installAppConfigs.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "tooling",
          include: ["scripts/**/*.test.mjs", ".claude/hooks/**/*.test.mjs"],
        },
      },
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.test.ts",
        "src/testSupport/**",
        "src/02_SpreadsheetRaw/toIntegrate.ts",
        "src/testingGoogleApiFunctions.ts",
        "src/TypeDeclarations/**",
      ],
    },
  },
});
