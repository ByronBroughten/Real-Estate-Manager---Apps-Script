import type { Endpoint } from "@byronbroughten/sheets-framework";
import { Arr } from "../appUtils/Arr";
import { OccupancyLedgerOperator } from "./BusinessOperators/OccupancyLedgerOperator";

export const buildLedger: Endpoint<"occupancy"> = {
  timeLastRan: "buildLedgerTimeLastRan",
  runStatus: "buildLedgerRunStatus",
  selector: { column: "buildLedgerSelect", requireOneRow: true },
  action: (ss, { selectedRowIndexes }) =>
    OccupancyLedgerOperator.init(ss).build(
      Arr.firstOrThrow(selectedRowIndexes),
    ),
};
