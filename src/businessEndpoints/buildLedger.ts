import type { Endpoint } from "../06_API/Endpoints";
import { Arr } from "../utils/Arr";
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
