import { describe, expect, it } from "vitest";
import { STYLE_GATE_REASON, editDecision, isStyleRead } from "./styleGate.mjs";

const projectDir = "/repo";
const edit = (filePath, hasReadStyle, cwd = projectDir) =>
  editDecision({ projectDir, cwd, filePath, hasReadStyle });

describe("editDecision", () => {
  it("denies a src/ TypeScript edit before STYLE.md was read", () => {
    expect(edit("/repo/src/02_SpreadsheetRaw/SheetRaw.ts", false)).toEqual({
      denyReason: STYLE_GATE_REASON,
    });
  });

  it("denies a relative src/ path resolved from the working directory", () => {
    expect(edit("SheetRaw.ts", false, "/repo/src/02_SpreadsheetRaw")).toEqual({
      denyReason: STYLE_GATE_REASON,
    });
  });

  it("allows a src/ TypeScript edit after STYLE.md was read", () => {
    expect(edit("/repo/src/02_SpreadsheetRaw/SheetRaw.ts", true)).toEqual({
      denyReason: null,
    });
  });

  it("allows edits outside src/", () => {
    expect(edit("/repo/scripts/docLint.mjs", false)).toEqual({ denyReason: null });
    expect(edit("/repo/vitest.config.ts", false)).toEqual({ denyReason: null });
    expect(edit("/elsewhere/src/x.ts", false)).toEqual({ denyReason: null });
  });

  it("allows non-TypeScript edits inside src/", () => {
    expect(edit("/repo/src/AGENTS.md", false)).toEqual({ denyReason: null });
  });

  it("leaves generated files to the generated-data warning", () => {
    expect(
      edit("/repo/src/01_SpreadsheetSchema/generated/sheetConfigs.ts", false),
    ).toEqual({ denyReason: null });
  });

  it("names what to read and to retry", () => {
    expect(STYLE_GATE_REASON).toMatch(/STYLE\.md/);
    expect(STYLE_GATE_REASON).toMatch(/retry/);
  });
});

describe("isStyleRead", () => {
  it("is true for a Read of the root STYLE.md", () => {
    expect(isStyleRead({ projectDir, cwd: projectDir, filePath: "/repo/STYLE.md" })).toBe(true);
    expect(isStyleRead({ projectDir, cwd: "/repo/src", filePath: "../STYLE.md" })).toBe(true);
  });

  it("is false for any other file", () => {
    expect(isStyleRead({ projectDir, cwd: projectDir, filePath: "/repo/docs/style/naming.md" })).toBe(false);
    expect(isStyleRead({ projectDir, cwd: projectDir, filePath: "/other/STYLE.md" })).toBe(false);
  });
});
