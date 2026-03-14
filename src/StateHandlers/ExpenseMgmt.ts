import type { SectionValues } from "../appSchema/1. attributes/varbAttributes";
import { Obj } from "../utils/Obj";
import { OperatorBase } from "./HandlerBases/OperatorBase";

export class ExpenseMgmt extends OperatorBase {
  addExpense(values: SectionValues<"addExpense">) {
    const expense = this.ss.sheet("expense");
    const hhCharge = this.ss.sheet("hhCharge");
    const { expenseNotes, ...expenseVals } = Obj.strictPick(values, [
      "date",
      "amount",
      "billerName",
      "description",
      "expenseCategory",
      "hhChargeLesserAmount",
      "propertyId",
      "receiptFormat",
      "taxAdjust",
      "unitId",
      "expenseNotes",
    ]);

    const expenseId = expense.addRowWithValues({
      ...expenseVals,
      notes: expenseNotes,
    });

    if (values.hhToChargeName) {
      if (!values.householdId) {
        throw new Error("Household ID is required");
      }

      const { amount, hhChargeLesserAmount, hhChargeNotes, ...hhChargeVals } =
        Obj.strictPick(values, [
          "householdId",
          "date",
          "amount",
          "hhChargeLesserAmount",
          "unitId",
          "hhChargeNotes",
        ]);
      hhCharge.addRowWithValues({
        expenseId,
        amount: hhChargeLesserAmount === "" ? amount : hhChargeLesserAmount,
        description: "Damage, waste, or service",
        portion: "Household",
        ...hhChargeVals,
        notes: hhChargeNotes,
      });
    }
    this.ss.batchUpdateRanges();
  }
}
