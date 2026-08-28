import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    restoreMocks: true,
    unstubGlobals: true,
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
