import type { GroupSectionName } from "../appSchema/1. attributes/sectionAttributes";
import type {
  SectionValues,
  VarbValue,
} from "../appSchema/1. attributes/varbAttributes";
import { Obj } from "../utils/Obj";
import { OperatorBase } from "./HandlerBases/OperatorBase";
import type { Row } from "./Row";
import type { Sheet } from "./Sheet";

type LedgerInputSn = GroupSectionName<"ledgerInputs">;

interface IdsAndPortion {
  householdId: string;
  subsidyContractId: string;
  portion: VarbValue<LedgerInputSn, "portion">;
}

interface RowsOfIdAndPortionProps<
  SN extends LedgerInputSn,
> extends IdsAndPortion {
  sheet: Sheet<SN>;
}
function rowsOfIdAndPortion<SN extends LedgerInputSn>({
  sheet,
  householdId,
  subsidyContractId,
  portion,
}: RowsOfIdAndPortionProps<SN>): Row<SN>[] {
  const rows = sheet.orderedRows;
  return rows.filter((row) => {
    const vals = row.values(["portion", "householdId", "subsidyContractId"]);
    if (householdId === vals.householdId && portion === vals.portion) {
      if (portion === "Subsidy program") {
        return subsidyContractId === vals.subsidyContractId;
      } else {
        return true;
      }
    } else {
      return false;
    }
  });
}

export class LedgerMgmt extends OperatorBase {
  buildHhLedger(values: SectionValues<"buildHhLedger">): void {
    const hhLedger = this.sheet("hhLedger");
    const buildApi = this.sheet("buildHhLedger");
    hhLedger.DELETE_ALL_BODY_ROWS();

    const idsAndPortion = Obj.strictPick(values, [
      "householdId",
      "subsidyContractId",
      "portion",
    ]);

    this.addChargesToLedger(idsAndPortion);
    this.addAllocationsToLedger(idsAndPortion);
    hhLedger.sort("date");
    buildApi.topBodyRow.setValues({
      dateLastRan: new Date(),
      hhIdLastRan: values.householdId,
    });
    this.ss.batchUpdateRanges();
  }
  private addChargesToLedger(idsAndPortion: IdsAndPortion): void {
    const hhLedger = this.sheet("hhLedger");
    const hhCharge = this.sheet("hhCharge");

    const filteredCharges = rowsOfIdAndPortion({
      sheet: hhCharge,
      ...idsAndPortion,
    });

    for (const row of filteredCharges) {
      const { amount, ...rest } = row.values([
        "amount",
        "date",
        "description",
        "unitName",
      ]);
      hhLedger.addRowWithValues({
        issuer: "Property management",
        charge: amount,
        payment: "",
        notes: "",
        ...rest,
      });
    }
  }
  private addAllocationsToLedger(idsAndPortion: IdsAndPortion): void {
    const hhLedger = this.sheet("hhLedger");
    const hhPaymentAllocation = this.sheet("hhPaymentAllocation");

    const filteredAllocations = rowsOfIdAndPortion({
      sheet: hhPaymentAllocation,
      ...idsAndPortion,
    });

    for (const row of filteredAllocations) {
      if (row.value("processed") === "No") {
        continue;
      }
      const { amount, payer, ...rest } = row.values([
        "amount",
        "payer",
        "date",
        "description",
        "unitName",
      ]);
      hhLedger.addRowWithValues({
        issuer: payer,
        payment: amount,
        charge: "",
        notes: "",
        ...rest,
      });
    }
  }
}
