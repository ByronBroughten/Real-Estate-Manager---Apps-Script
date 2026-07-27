import type { ApiFnValues } from "../ApiSingle";

import { OperatorBase } from "../3. SpreadsheetNamed/ClassBases/OperatorBase";
import type { Row } from "../3. SpreadsheetNamed/RowNamed";
import type { SheetNamed } from "../3. SpreadsheetNamed/SheetNamed";
import { Obj } from "../utils/Obj";
import type { GroupToTableName } from "../0. spreadsheetMetaData/4.1 tableNameGroups";

type LedgerInputSn = GroupToTableName<"ledgerInputs">;

interface IdsAndPortion {
  householdId: string;
  subsidyAgreementId: string;
  portion: ColumnValueLedgerInputSn, "portion">;
}

interface RowsOfIdAndPortionProps<
  TN extends LedgerInputSn,
> extends IdsAndPortion {
  sheet: SheetNamed<TN>;
}
function rowsOfIdAndPortion<TN extends LedgerInputSn>({
  sheet,
  householdId,
  subsidyAgreementId,
  portion,
}: RowsOfIdAndPortionProps<TN>): Row<TN>[] {
  const rows = sheet.orderedRows;
  return rows.filter((row) => {
    const vals = row.values(["portion", "householdId", "subsidyAgreementId"]);
    if (householdId === vals.householdId && portion === vals.portion) {
      if (portion === "Subsidy program") {
        return subsidyAgreementId === vals.subsidyAgreementId;
      } else {
        return true;
      }
    } else {
      return false;
    }
  });
}

export class LedgerMgmt extends OperatorBase {
  buildHhLedger(values: ApiFnValues<"buildHhLedger">): void {
    const hhLedger = this.sheet("occupancyLedger");
    hhLedger.DELETE_ALL_BODY_ROWS();

    const idsAndPortion = Obj.strictPick(values, [
      "householdId",
      "subsidyAgreementId",
      "portion",
    ]);

    this.addChargesToLedger(idsAndPortion);
    this.addAllocationsToLedger(idsAndPortion);
    hhLedger.sort("date");
    this.ss.gatherRequestsAndBatchUpdate();
  }
  private addChargesToLedger(idsAndPortion: IdsAndPortion): void {
    const hhLedger = this.sheet("occupancyLedger");
    const occCharge = this.sheet("occCharge");

    const filteredCharges = rowsOfIdAndPortion({
      sheet: occCharge,
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
    const occPayAllocation = this.sheet("occPayAllocation");

    const filteredAllocations = rowsOfIdAndPortion({
      sheet: occPayAllocation,
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
