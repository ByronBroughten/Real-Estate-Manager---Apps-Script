import { describe, it } from "vitest";
import type {
  ColumnFullName,
  ColumnNameFiltered,
} from "../01_generatedConfigs/columnConfigsTypes";
import type { SheetNameSimple } from "../01_generatedConfigs/sheetConfigsTypes";
import { assertType, type IsExactly } from "../testSupport/typeAssertions";
import type { Endpoint, Endpoints } from "./Endpoints";

type SelectorOf<SN extends SheetNameSimple> = NonNullable<
  Endpoint<SN>["selector"]
>;
type TimeLastRanOf<SN extends SheetNameSimple> = NonNullable<
  Endpoint<SN>["timeLastRan"]
>;

describe("Endpoint's column parameters", () => {
  it("resolve to the entry column's own sheet", () => {
    assertType<
      IsExactly<SelectorOf<"sheetConfig">, "hasIdColumn" | "letApiAccess">
    >(true);
    assertType<
      IsExactly<
        TimeLastRanOf<"spreadsheetControls">,
        | "fillRowIdsTimeLastRan"
        | "fillRowIdsRunStatus"
        | "syncConfigSheetRowsTimeLastRan"
        | "syncConfigSheetRowsRunStatus"
        | "tableControlsSpace"
      >
    >(true);
  });

  it("are filtered to the value type each one needs", () => {
    assertType<
      IsExactly<
        SelectorOf<"occupancy">,
        ColumnNameFiltered<"occupancy", "boolean", false>
      >
    >(true);
    assertType<
      IsExactly<
        TimeLastRanOf<"occupancy">,
        ColumnNameFiltered<"occupancy", "string", false>
      >
    >(true);
  });
});

describe("Endpoint at the widened sheet name the dispatch boundary uses", () => {
  it("resolves to the cross-sheet union rather than to never", () => {
    assertType<
      IsExactly<
        SelectorOf<SheetNameSimple>,
        ColumnNameFiltered<SheetNameSimple, "boolean", false>
      >
    >(true);
    assertType<
      IsExactly<
        Extract<SelectorOf<SheetNameSimple>, "buildLedgerSelect">,
        "buildLedgerSelect"
      >
    >(true);
  });
});

describe("Endpoints", () => {
  it("is keyed by every column full name and nothing else", () => {
    assertType<IsExactly<keyof Endpoints, ColumnFullName>>(true);
  });
});
