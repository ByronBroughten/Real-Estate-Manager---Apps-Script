import { defineConfig } from "vitest/config";

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
          include: ["packages/framework/{src,dev}/**/*.test.ts"],
          setupFiles: ["packages/framework/dev/installDevConfigs.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "real-estate",
          include: ["packages/real-estate/src/**/*.test.ts"],
          setupFiles: ["packages/real-estate/src/installAppConfigs.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "tooling",
          include: [
            "scripts/**/*.test.ts",
            "packages/framework/scripts/**/*.test.ts",
            ".claude/hooks/**/*.test.ts",
          ],
        },
      },
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["packages/*/src/**/*.ts"],
      exclude: [
        "packages/*/src/**/*.test.ts",
        "packages/framework/src/testSupport/**",
        "packages/framework/src/TypeDeclarations/**",
      ],
    },
  },
});
