import type { Endpoint } from "../06_API/Endpoints";
import { PropertyExpenseOperator } from "./BusinessOperators/PropertyExpenseOperator";

export const addPropertyExpense: Endpoint<"addPropertyExpense"> = {
  runStatus: "runStatus",
  action: (ss, { selectedRowIndexes }) =>
    PropertyExpenseOperator.init(ss).add(selectedRowIndexes),
};
