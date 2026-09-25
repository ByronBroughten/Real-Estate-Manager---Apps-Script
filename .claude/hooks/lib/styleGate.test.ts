import { describe, expect, it } from "vitest";

import { type EditDecision, editDecision, isStyleRead,styleGateReason } from "./styleGate.ts";

const projectDir = "/repo";
const generatedDirs = ["packages/real-estate/src/generated", "packages/framework/dev/generated"];
function edit(filePath: string, hasReadStyle: boolean, cwd = projectDir): EditDecision {
  return editDecision({ projectDir, cwd, filePath, hasReadStyle, generatedDirs });
}
const frameworkFile = "/repo/packages/framework/src/02_SpreadsheetRaw/SheetRaw.ts";

describe("editDecision", () => {
  it("denies a TypeScript edit in either package's src/ before docs/style.md was read", () => {
    expect(edit(frameworkFile, false)).toEqual({ denyReason: styleGateReason });
    expect(edit("/repo/packages/real-estate/src/index.ts", false)).toEqual({ denyReason: styleGateReason });
  });

  it("denies a TypeScript edit in the framework's dev/, which ESLint lints too", () => {
    expect(edit("/repo/packages/framework/dev/devConfigs.ts", false)).toEqual({ denyReason: styleGateReason });
  });

  it("denies a relative path resolved from the working directory", () => {
    expect(edit("SheetRaw.ts", false, "/repo/packages/framework/src/02_SpreadsheetRaw")).toEqual({
      denyReason: styleGateReason,
    });
  });

  it("allows a gated TypeScript edit after docs/style.md was read", () => {
    expect(edit(frameworkFile, true)).toEqual({ denyReason: undefined });
  });

  it("denies an edit to tooling, which ESLint lints too", () => {
    expect(edit("/repo/.claude/hooks/lib/bashReads.ts", false)).toEqual({ denyReason: styleGateReason });
    expect(edit("/repo/scripts/docLint.ts", false)).toEqual({ denyReason: styleGateReason });
    expect(edit("/repo/packages/framework/scripts/rollupPreset.js", false)).toEqual({ denyReason: styleGateReason });
    expect(edit("/repo/eslint.config.mjs", false)).toEqual({ denyReason: styleGateReason });
  });

  it("allows edits outside the ESLint set", () => {
    expect(edit("/repo/packages/framework/dist/bundle.js", false)).toEqual({ denyReason: undefined });
    expect(edit("/repo/coverage/prettify.js", false)).toEqual({ denyReason: undefined });
    expect(edit("/repo/node_modules/x/index.js", false)).toEqual({ denyReason: undefined });
    expect(edit("/repo/.claude/worktrees/agent-1/scripts/docLint.ts", false)).toEqual({ denyReason: undefined });
    expect(edit("/elsewhere/packages/framework/src/x.ts", false)).toEqual({ denyReason: undefined });
  });

  it("allows non-code edits", () => {
    expect(edit("/repo/packages/framework/src/AGENTS.md", false)).toEqual({ denyReason: undefined });
    expect(edit("/repo/packages/framework/sheets.config.json", false)).toEqual({ denyReason: undefined });
  });

  it("leaves every package's generated files to the generated-data warning", () => {
    expect(edit("/repo/packages/real-estate/src/generated/sheetConfigs.ts", false)).toEqual({ denyReason: undefined });
    expect(edit("/repo/packages/framework/dev/generated/sheetConfigs.ts", false)).toEqual({ denyReason: undefined });
  });

  it("does not say it only covers packages/", () => {
    expect(styleGateReason).not.toMatch(/under packages/);
  });

  it("names what to read and to retry", () => {
    expect(styleGateReason).toMatch(/docs\/style\.md/);
    expect(styleGateReason).toMatch(/retry/);
  });
});

describe("isStyleRead", () => {
  function read(
    filePath: string,
    bounds: { offset?: number; limit?: number; totalLines?: number } = {},
    cwd = projectDir,
  ): boolean {
    return isStyleRead({ projectDir, cwd, filePath, totalLines: 40, ...bounds });
  }

  it("is true for an unbounded Read of docs/style.md", () => {
    expect(read("/repo/docs/style.md")).toBe(true);
    expect(read("../docs/style.md", {}, "/repo/src")).toBe(true);
  });

  it("is false for a Read whose limit stops short of the end", () => {
    expect(read("/repo/docs/style.md", { limit: 5 })).toBe(false);
    expect(read("/repo/docs/style.md", { offset: 1, limit: 39 })).toBe(false);
  });

  it("is false for a Read that starts past the top", () => {
    expect(read("/repo/docs/style.md", { offset: 2 })).toBe(false);
    expect(read("/repo/docs/style.md", { offset: 10, limit: 100 })).toBe(false);
  });

  it("is true for a bounded Read that covers the whole file", () => {
    expect(read("/repo/docs/style.md", { limit: 40 })).toBe(true);
    expect(read("/repo/docs/style.md", { offset: 1, limit: 2000 })).toBe(true);
  });

  it("is false for a bounded Read when the file's length is unknown", () => {
    expect(read("/repo/docs/style.md", { limit: 2000, totalLines: undefined })).toBe(false);
  });

  it("is false for any other file", () => {
    expect(read("/repo/docs/style/naming.md")).toBe(false);
    expect(read("/other/docs/style.md")).toBe(false);
  });

  it("is false for a full Read of a stale root STYLE.md", () => {
    expect(read("/repo/STYLE.md")).toBe(false);
  });
});

describe("the refusal reason", () => {
  it("says a partial Read doesn't count", () => {
    expect(styleGateReason).toMatch(/full Read/);
    expect(styleGateReason).toMatch(/partial/);
  });
});
