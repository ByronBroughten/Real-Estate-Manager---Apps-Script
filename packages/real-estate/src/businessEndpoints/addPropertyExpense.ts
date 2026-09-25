import type { Endpoint } from "@byronbroughten/sheets-framework";

import { PropertyExpenseOperator } from "./BusinessOperators/PropertyExpenseOperator";

export const addPropertyExpense: Endpoint<"addPropertyExpense"> = {
  runStatus: "runStatus",
  action: (ss, { selectedRowIndexes }) =>
    PropertyExpenseOperator.init(ss).add(selectedRowIndexes),
};
