import { describe, expect, it } from "vitest";

import { bashDecision, type Decision, devWriteOf, type GsheetsWrite, gsheetsWriteDecision } from "./pinnedTargets.ts";

describe("devWriteOf", () => {
  it("names a dev gen:configs, build, push or run", () => {
    expect(devWriteOf("npm run dev:gen:configs")).toBe("dev:gen:configs");
    expect(devWriteOf("npm run dev:build")).toBe("dev:build");
    expect(devWriteOf("npm run dev:push")).toBe("dev:push");
    expect(devWriteOf("npm run dev:run triggerOnEdit")).toBe("dev:run");
  });

  it("names a dev chore only when it sends", () => {
    expect(devWriteOf("npm run dev:chore buildFixtures -- --send")).toBe("dev:chore");
    expect(devWriteOf("npm run dev:chore buildFixtures")).toBeNull();
    expect(devWriteOf("npm run dev:chore buildFixtures -- --json")).toBeNull();
  });

  it("ignores dev reads and app commands", () => {
    expect(devWriteOf("npm run dev:probe -- --fields sheets")).toBeNull();
    expect(devWriteOf("npm run -s dev:probe -- --fields sheets")).toBeNull();
    expect(devWriteOf("npm run app:gen:configs")).toBeNull();
    expect(devWriteOf("npm test")).toBeNull();
  });

  it("finds the write in any part of a compound command", () => {
    expect(devWriteOf("npm run tsc && npm run dev:gen:configs")).toBe("dev:gen:configs");
    expect(devWriteOf("cd /repo; npm run -s dev:build | tail")).toBe("dev:build");
  });

  it("treats an unparseable command that names a dev script as a write", () => {
    expect(devWriteOf("npm run dev:probe 'unbalanced")).toBe("dev:*");
    expect(devWriteOf("echo 'unbalanced")).toBeNull();
  });
});

describe("bashDecision", () => {
  const command = "npm run dev:gen:configs";

  it("leaves a dev write alone while every pinning file is clean", () => {
    expect(bashDecision({ command, dirtyPinningFiles: [] })).toBeNull();
  });

  it("asks for a dev write while a pinning file has uncommitted changes, naming it", () => {
    const decision = bashDecision({ command, dirtyPinningFiles: ["packages/framework/sheets.config.json"] });
    expect(decision?.permissionDecision).toBe("ask");
    expect(decision?.reason).toMatch(/dev:gen:configs/);
    expect(decision?.reason).toMatch(/packages\/framework\/sheets\.config\.json/);
  });

  it("asks when the pinning files' state is unknown", () => {
    expect(bashDecision({ command, dirtyPinningFiles: null })?.permissionDecision).toBe("ask");
  });

  it("leaves anything but a dev write alone, however dirty", () => {
    const dirty = ["packages/framework/sheets.config.json"];
    expect(bashDecision({ command: "npm run dev:probe", dirtyPinningFiles: dirty })).toBeNull();
    expect(bashDecision({ command: "npm run app:build", dirtyPinningFiles: dirty })).toBeNull();
  });
});

describe("gsheetsWriteDecision", () => {
  const devSpreadsheetId = "dev-id";
  function decide(overrides: Partial<GsheetsWrite>): Decision | null {
    return gsheetsWriteDecision({
      toolName: "mcp__gsheets__update_cells",
      spreadsheetId: "dev-id",
      devSpreadsheetId,
      dirtyPinningFiles: [],
      ...overrides,
    });
  }

  it("allows update_cells, batch_update_cells and create_sheet on the dev spreadsheet", () => {
    for (const toolName of [
      "mcp__gsheets__update_cells",
      "mcp__gsheets__batch_update_cells",
      "mcp__gsheets__create_sheet",
    ]) {
      expect(decide({ toolName })).toEqual({ permissionDecision: "allow", reason: expect.any(String) });
    }
  });

  it("asks for any other spreadsheet, with the exact sheet, range and values", () => {
    const decision = decide({ spreadsheetId: "app-id" });
    expect(decision?.permissionDecision).toBe("ask");
    expect(decision?.reason).toMatch(/not the dev spreadsheet/);
    expect(decision?.reason).toMatch(/sheet, range and values/);
  });

  it("asks on the dev spreadsheet while a pinning file has uncommitted changes", () => {
    const decision = decide({ dirtyPinningFiles: [".claude/hooks/pinnedTargetGuard.ts"] });
    expect(decision?.permissionDecision).toBe("ask");
    expect(decision?.reason).toMatch(/pinnedTargetGuard\.ts/);
  });

  it("asks when the dev ID or the pinning files' state is unknown", () => {
    expect(decide({ devSpreadsheetId: undefined })?.permissionDecision).toBe("ask");
    expect(decide({ spreadsheetId: undefined, devSpreadsheetId: undefined })?.permissionDecision).toBe("ask");
    expect(decide({ dirtyPinningFiles: null })?.permissionDecision).toBe("ask");
  });

  it("has no opinion on a tool it does not guard", () => {
    expect(decide({ toolName: "mcp__gsheets__share_spreadsheet" })).toBeNull();
    expect(decide({ toolName: "mcp__gsheets__create_spreadsheet" })).toBeNull();
    expect(decide({ toolName: "mcp__gsheets__get_sheet_data" })).toBeNull();
  });
});
