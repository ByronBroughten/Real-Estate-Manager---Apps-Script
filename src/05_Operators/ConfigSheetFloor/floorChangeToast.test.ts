import { describe, expect, it } from "vitest";
import { configSheetFloorSeed } from "../../01_SpreadsheetSchema/configSheetFloorSeed";
import { getSheetTraitByName } from "../../01_SpreadsheetSchema/sheetConfigsTypes";
import { floorChangeToast } from "./floorChangeToast";

const businessSheetGid = 9001;
const spreadsheetConfigGid = getSheetTraitByName(
  "spreadsheetConfig",
  "sheetGid",
);
const sheetConfigGid = getSheetTraitByName("sheetConfig", "sheetGid");
const columnConfigGid = getSheetTraitByName("columnConfig", "sheetGid");
const valueConfigGid = getSheetTraitByName("valueConfig", "sheetGid");

function liveTitles(
  overrides: Record<number, string | null> = {},
): Map<number, string> {
  const titles = new Map<number, string | null>([
    [businessSheetGid, "Occupancy"],
    [spreadsheetConfigGid, configSheetFloorSeed.spreadsheetConfig.title],
    [sheetConfigGid, configSheetFloorSeed.sheetConfig.title],
    [columnConfigGid, configSheetFloorSeed.columnConfig.title],
    [valueConfigGid, configSheetFloorSeed.valueConfig.title],
  ]);
  Object.entries(overrides).forEach(([sheetGid, title]) => {
    titles.set(Number(sheetGid), title);
  });
  return new Map(
    [...titles].flatMap(([sheetGid, title]) =>
      title === null ? [] : [[sheetGid, title] as const],
    ),
  );
}

describe("floorChangeToast", () => {
  it("says a renamed Value Config's title is managed and will revert on the next config sync", () => {
    const message = floorChangeToast(
      "OTHER",
      liveTitles({ [valueConfigGid]: "Values" }),
    );
    expect(message).toBe(
      "Value Config's tab title is managed and will revert to Value Config on the next config sync.",
    );
  });

  it("tells whoever deleted Value Config to undo now, because the next config sync recreates it empty", () => {
    const message = floorChangeToast(
      "REMOVE_GRID",
      liveTitles({ [valueConfigGid]: null }),
    );
    expect(message).toBe(
      "Value Config was deleted. Undo now to restore it: the next config sync recreates it empty.",
    );
  });

  it("says nothing when a business tab is renamed", () => {
    expect(
      floorChangeToast("OTHER", liveTitles({ [businessSheetGid]: "Leases" })),
    ).toBeNull();
  });

  it.each([
    ["Spreadsheet Config", spreadsheetConfigGid],
    ["Sheet Config", sheetConfigGid],
    ["Column Config", columnConfigGid],
  ])("says nothing when warned %s is renamed", (title, sheetGid) => {
    expect(
      floorChangeToast("OTHER", liveTitles({ [sheetGid]: `Old ${title}` })),
    ).toBeNull();
  });

  it("says nothing when a business tab is deleted", () => {
    expect(
      floorChangeToast("REMOVE_GRID", liveTitles({ [businessSheetGid]: null })),
    ).toBeNull();
  });

  it("says nothing for a change that renames or deletes nothing", () => {
    expect(floorChangeToast("OTHER", liveTitles())).toBeNull();
    expect(floorChangeToast("REMOVE_GRID", liveTitles())).toBeNull();
    expect(floorChangeToast("INSERT_ROW", liveTitles())).toBeNull();
  });
});
