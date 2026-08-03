import type { ApiFnValues } from "../ApiSingle";

import type { GroupToTableName } from "../0. spreadsheetMetaData/4.1 tableNameGroups";
import { OperatorBase } from "../3. SpreadsheetNamed/ClassBases/OperatorBase";
import type { RowNamed } from "../3. SpreadsheetNamed/RowNamed";
import type { SheetNamed } from "../3. SpreadsheetNamed/SheetNamed";
import { Obj } from "../utils/Obj";

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
}: RowsOfIdAndPortionProps<TN>): RowNamed<TN>[] {
  const rows = sheet.dataRows;
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
    hhLedger.RESET_TOP_ROW_DELETE_REST();

    const idsAndPortion = Obj.strictPick(values, [
      "householdId",
      "subsidyAgreementId",
      "portion",
    ]);

    this.addChargesToLedger(idsAndPortion);
    this.addAllocationsToLedger(idsAndPortion);
    this.ss.gatherRequestsAndBatchUpdate();
    // sort from the sheet itself
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
      hhLedger.appendRowWithVals({
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
      hhLedger.appendRowWithVals({
        issuer: payer,
        payment: amount,
        charge: "",
        notes: "",
        ...rest,
      });
    }
  }
}
