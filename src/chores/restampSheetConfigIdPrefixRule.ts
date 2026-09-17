import {
  conditionalFormatRulesEqual,
  rangeEqual,
  type ConditionalFormatDeclaration,
  type ConditionalFormatRule,
} from "../00_base/ConditionalFormat";
import { Val } from "../utils/Val";
import type { Chore } from "./Chore";

const PINK = { red: 244 / 255, green: 204 / 255, blue: 204 / 255 };

export const restampSheetConfigIdPrefixRule: Chore = {
  description:
    "Removes Sheet Config's ID prefix conditional format rule and re-adds it from a declaration, then diffs the re-read against the snapshot.",
  action: (ss) => {
    const sheet = ss.sheet("sheetConfig");
    sheet.prepFetchConditionalFormatRules();
    ss.fetchAllPrepped();
    const idPrefix = sheet.column("idPrefix");
    const range = idPrefix.raw.dataGridRange;
    const before = sheet
      .conditionalFormatRules()
      .filter(
        (rule) => rule.ranges.length === 1 && rangeEqual(range, rule.ranges[0]),
      );
    if (before.length !== 1) {
      return `Expected 1 ID prefix rule, found ${before.length}: ${JSON.stringify(before)}`;
    }
    const snapshot = Val.assert(before[0], "ID prefix rule snapshot");
    const declaration: ConditionalFormatDeclaration = {
      condition: {
        type: "CUSTOM_FORMULA",
        formula: `=${idPrefix.anchoredA1("idPrefixIsUniqueOrEmpty")}=FALSE`,
      },
      format: { backgroundColor: PINK },
    };
    const declared: ConditionalFormatRule = {
      kind: "boolean",
      ranges: [range],
      ...declaration,
    };
    const declarationMatches = conditionalFormatRulesEqual(snapshot, declared);
    idPrefix.removeConditionalFormatRule(snapshot);
    idPrefix.addConditionalFormatRule(declaration);
    ss.batchUpdateGSheets();
    sheet.prepFetchConditionalFormatRules();
    ss.fetchAllPrepped({ skipFetchingProperties: true });
    const after = sheet
      .conditionalFormatRules()
      .filter(
        (rule) => rule.ranges.length === 1 && rangeEqual(range, rule.ranges[0]),
      );
    return ruleDiffReport(snapshot, declared, after, declarationMatches);
  },
};

function ruleDiffReport(
  snapshot: ConditionalFormatRule,
  declared: ConditionalFormatRule,
  after: ConditionalFormatRule[],
  declarationMatches: boolean,
): string {
  const afterRule = after[0];
  const afterMatches =
    after.length === 1 &&
    afterRule !== undefined &&
    conditionalFormatRulesEqual(declared, afterRule);
  if (declarationMatches && afterMatches) {
    return "ID prefix rule round-tripped with an empty diff.";
  }
  return [
    "ID prefix rule round-trip differed.",
    `declaration matches snapshot: ${declarationMatches}`,
    `before: ${JSON.stringify(snapshot)}`,
    `declared: ${JSON.stringify(declared)}`,
    `after: ${JSON.stringify(after)}`,
  ].join("\n");
}
