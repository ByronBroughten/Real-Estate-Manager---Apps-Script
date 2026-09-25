import { defineConfig } from "vitest/config";

// The framework runs its own tests from its vitest.config.ts; the root's `npm test` reaches it through the workspaces.
export default defineConfig({
  test: {
    environment: "node",
    restoreMocks: true,
    unstubGlobals: true,
    projects: [
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
          include: ["config/**/*.test.ts", ".claude/hooks/**/*.test.ts"],
        },
      },
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["packages/real-estate/src/**/*.ts"],
      exclude: ["packages/real-estate/src/**/*.test.ts"],
    },
  },
});
