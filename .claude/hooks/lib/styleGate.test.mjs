import { describe, expect, it } from "vitest";
import { STYLE_GATE_REASON, editDecision, isStyleRead } from "./styleGate.mjs";

const projectDir = "/repo";
const edit = (filePath, hasReadStyle, cwd = projectDir) =>
  editDecision({ projectDir, cwd, filePath, hasReadStyle, generatedDirs: ["src/01_SpreadsheetSchema/generated"] });

describe("editDecision", () => {
  it("denies a src/ TypeScript edit before docs/style.md was read", () => {
    expect(edit("/repo/src/02_SpreadsheetRaw/SheetRaw.ts", false)).toEqual({
      denyReason: STYLE_GATE_REASON,
    });
  });

  it("denies a relative src/ path resolved from the working directory", () => {
    expect(edit("SheetRaw.ts", false, "/repo/src/02_SpreadsheetRaw")).toEqual({
      denyReason: STYLE_GATE_REASON,
    });
  });

  it("allows a src/ TypeScript edit after docs/style.md was read", () => {
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
    expect(STYLE_GATE_REASON).toMatch(/docs\/style\.md/);
    expect(STYLE_GATE_REASON).toMatch(/retry/);
  });
});

describe("isStyleRead", () => {
  const read = (filePath, bounds = {}, cwd = projectDir) =>
    isStyleRead({ projectDir, cwd, filePath, totalLines: 40, ...bounds });

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
    expect(STYLE_GATE_REASON).toMatch(/full Read/);
    expect(STYLE_GATE_REASON).toMatch(/partial/);
  });
});
