import { OperatorBase } from "./HandlerBases/OperatorBase";

export class ExpenseMgmt extends OperatorBase {
  // I don't need the values, right?
  addExpenses() {
    const addExpenses = this.ss.sheet("addExpenses");
    const expense = this.ss.sheet("expense");

    for (const row of addExpenses.orderedRows) {
      const { expenseNotes, ...expenseVals } = row.values([
        "date",
        "propertyId",
        "unitId",
        "billerName",
        "expenseCategory",
        "description",
        "amount",
        "receiptFormat",
        "taxAdjust",
        "expenseNotes",
      ]);
      expense.addRowWithValues({
        ...expenseVals,
        notes: expenseNotes,
      });
      if (row.value("hhToChargeName")) {
        throw new Error(
          "For now, we don't support adding an expense and hh charge in the same API call. Please add the charge after.",
        );
      }
    }
    // if (values.hhToChargeName) {
    //   if (!values.householdId) {
    //     throw new Error("Household ID is required");
    //   }

    //   const { amount, hhChargeLesserAmount, hhChargeNotes, ...hhChargeVals } =
    //     Obj.strictPick(values, [
    //       "householdId",
    //       "date",
    //       "amount",
    //       "hhChargeLesserAmount",
    //       "unitId",
    //       "hhChargeNotes",
    //     ]);
    //   hhCharge.addRowWithValues({
    //     amount: hhChargeLesserAmount === "" ? amount : hhChargeLesserAmount,
    //     description: "Damage, waste, or service",
    //     portion: "Household",
    //     ...hhChargeVals,
    //     notes: hhChargeNotes,
    //   });
    // }
    this.ss.batchUpdateRanges();
  }
}
