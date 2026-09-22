// PROTOTYPE #114, throwaway: app call sites go through app/configs.ts aliases, else they'd spell <AppConfigs, ...>.
import { Api } from "../framework/index";
import * as fixture from "../../fixtureConfigs";
import { appConfigs, type ColumnValue, type Endpoints, type SheetNamed } from "./configs";

function bumpUnit(unit: SheetNamed<"unit">): void {
  unit.setValue(0, "name", "Unit 4B");
}
const endpoints: Endpoints = {
  addPropertyExpense: (api) => bumpUnit(api.sheet("unit")),
};
const api = new Api(appConfigs, endpoints, {});
const expense = api.sheet("propertyExpense");
const amount: ColumnValue<"propertyExpense", "amount"> = 12.5;
expense.setValue(0, "amount", amount);
// @ts-expect-error: "amount" is a number column
if (Math.random() > 2) expense.setValue(0, "amount", "twelve");
// @ts-expect-error: fixture sheets aren't in the app's set
api.sheet("widget");
// Two config sets in one program: only this variant allows it.
const fixtureApi = new Api(fixture, {}, {});
fixtureApi.sheet("widget").setValue(0, "count", 1);
api.onEdit(1964495656);
console.log("  app:", { header: expense.header("amount"), amount: expense.value(0, "amount"), unit: api.sheet("unit").value(0, "name") });
