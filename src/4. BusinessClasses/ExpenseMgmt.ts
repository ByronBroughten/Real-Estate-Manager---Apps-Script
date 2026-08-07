import { OperatorBase } from "../3. SpreadsheetNamed/ClassBases/OperatorBase";

export class ExpenseMgmt extends OperatorBase {
  // I don't need the values, right?
  addPropertyExpenses() {
    const addPropertyExpenses = this.ss.sheet("addPropertyExpenses");
    const expense = this.ss.sheet("expense");

    for (const row of addPropertyExpenses.dataRows) {
      const { expenseNotes, ...expenseVals } = row.values(
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
      );
      expense.appendRowWithVals({
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

    //   const { amount, occChargeLesserAmount, occChargeNotes, ...occChargeVals } =
    //     Obj.strictPick(values, [
    //       "householdId",
    //       "date",
    //       "amount",
    //       "occChargeLesserAmount",
    //       "unitId",
    //       "occChargeNotes",
    //     ]);
    //   occCharge.appendRowWithVals({
    //     amount: occChargeLesserAmount === "" ? amount : occChargeLesserAmount,
    //     description: "Damage, waste, or service",
    //     portion: "Household",
    //     ...occChargeVals,
    //     notes: occChargeNotes,
    //   });
    // }
    this.ss.gatherRequestsAndBatchUpdate();
  }
}
