import { getValueConfigValueArr } from "../../01_generatedConfigs/valueConfigsTypes";
import type { Chore } from "../Chore";

const storedValue = "Currency";
const renamedValue = "Payment";

export const renameCurrencyToPayment: Chore = {
  description: `Renames the paymentType value "${storedValue}" to "${renamedValue}" across both stored Form of payment columns and the Occupancy Year formula that filters on it (#19).`,
  action: (ss) => {
    const occPayment = ss
      .sheet("occPayment")
      .prepFetchColumnsFull("formOfPayment").formOfPayment;
    const subsidyPayment = ss
      .sheet("subsidyPayment")
      .prepFetchColumnsFull("formOfPayment").formOfPayment;
    const householdRentPaid = ss
      .sheet("occupancyYear")
      .prepFetchColumnsFull("householdRentPaid").householdRentPaid;
    ss.fetchAllPrepped();

    const report = [
      tallyLine("Occ Payment", occPayment.valueArrOrEmpty),
      tallyLine("Subsidy Payment", subsidyPayment.valueArrOrEmpty),
      `Occupancy Year household rent paid: ${householdRentPaid.valueArrOrEmpty.join(", ")}`,
    ].join("\n");

    occPayment.findReplace(wholeValueTerms());
    subsidyPayment.findReplace(wholeValueTerms());
    householdRentPaid.findReplace({
      // The quotes are part of the find, so nothing else in the formula can match.
      find: `"${storedValue}"`,
      replacement: `"${renamedValue}"`,
      matchCase: true,
      includeFormulas: true,
    });
    ss.batchUpdateGSheets();
    return report;
  },
};

function wholeValueTerms() {
  return {
    find: storedValue,
    replacement: renamedValue,
    matchCase: true,
    matchEntireCell: true,
  };
}

function tallyLine(sheetTitle: string, values: (string | "")[]): string {
  const tally = values.reduce<Record<string, number>>((counts, value) => {
    const label = value === "" ? "(blank)" : value;
    counts[label] = (counts[label] ?? 0) + 1;
    return counts;
  }, {});
  const counted = Object.entries(tally)
    .map(([label, count]) => `${label}: ${count}${offConfigMark(label)}`)
    .join(", ");
  return `${sheetTitle} form of payment — ${counted}`;
}

// Drift the rename neither fixes nor hides, surfaced where it can't be missed.
function offConfigMark(label: string): string {
  const offered = getValueConfigValueArr("paymentType") as readonly string[];
  if (label === "(blank)" || offered.includes(label)) return "";
  return " <- NOT A FORM OF PAYMENT";
}
