// PROTOTYPE #114, throwaway: app call sites. Note there's no config type argument anywhere.
import "./registerConfigs";
import { Api, type ColumnValue, type Endpoints, type SheetNamed } from "../framework/index";

function bumpUnit(unit: SheetNamed<"unit">): void {
  unit.setValue(0, "name", "Unit 4B");
}
const endpoints: Endpoints = {
  addPropertyExpense: (api) => bumpUnit(api.sheet("unit")),
};
const api = new Api(endpoints, {});
const expense = api.sheet("propertyExpense");
const amount: ColumnValue<"propertyExpense", "amount"> = 12.5;
expense.setValue(0, "amount", amount);
// @ts-expect-error: "amount" is a number column
if (Math.random() > 2) expense.setValue(0, "amount", "twelve");
// @ts-expect-error: fixture sheets don't leak into the app's program
api.sheet("widget");
api.onEdit(1964495656);
console.log("  app:", { header: expense.header("amount"), amount: expense.value(0, "amount"), unit: api.sheet("unit").value(0, "name") });
