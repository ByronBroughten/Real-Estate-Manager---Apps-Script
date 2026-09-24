import { describe, expect, it } from "vitest";
import { takeTarget } from "./targets.mjs";

const table = {
  app: { spreadsheetId: "app-id", generatedDir: "src/generated" },
  dev: { spreadsheetId: "dev-id", generatedDir: "dev/generated" },
};

describe("takeTarget", () => {
  it("resolves the named target's spreadsheet ID and output folder from the table", () => {
    expect(takeTarget(["--target", "dev"], table)).toEqual({
      target: {
        spreadsheetId: "dev-id",
        generatedDir: "dev/generated",
      },
      argv: [],
    });
  });

  it("leaves the other arguments in order", () => {
    expect(
      takeTarget(["--target", "app", "fillMissingRowIds", "--send"], table)
        .argv,
    ).toEqual(["fillMissingRowIds", "--send"]);
    expect(
      takeTarget(["fillMissingRowIds", "--target", "app", "--json"], table)
        .argv,
    ).toEqual(["fillMissingRowIds", "--json"]);
  });

  it("returns no target when --target is absent", () => {
    expect(takeTarget(["fillMissingRowIds"], table)).toEqual({
      target: null,
      argv: ["fillMissingRowIds"],
    });
  });

  it("refuses a target the table lacks, or a missing name", () => {
    expect(() => takeTarget(["--target", "prod"], table)).toThrow(
      /"prod".*app, dev/,
    );
    expect(() => takeTarget(["--target"], table)).toThrow(/app, dev/);
  });

  it("refuses a table whose targets share a spreadsheet ID", () => {
    const shared = { ...table, dev: { ...table.dev, spreadsheetId: "app-id" } };
    expect(() => takeTarget(["--target", "dev"], shared)).toThrow(
      /app and dev share/,
    );
  });

  it("refuses a row missing either field", () => {
    const partial = { ...table, dev: { spreadsheetId: "dev-id" } };
    expect(() => takeTarget(["--target", "dev"], partial)).toThrow(
      /generatedDir/,
    );
  });
});
