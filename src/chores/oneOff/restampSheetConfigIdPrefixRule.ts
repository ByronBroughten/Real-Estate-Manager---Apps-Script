import {
  conditionalFormatRulesEqual,
  rangeEqual,
  type ConditionalFormatDeclaration,
  type ConditionalFormatRule,
} from "../../00_base/ConditionalFormat";
import type { GridRangeProps } from "../../00_base/RawSource";
import { Val } from "../../utils/Val";
import type { Chore } from "../Chore";

const pink = { red: 244 / 255, green: 204 / 255, blue: 204 / 255 };

export const restampSheetConfigIdPrefixRule: Chore = {
  description:
    "Removes Sheet Config's ID prefix conditional format rule and re-adds it from a declaration, then diffs the re-read against the snapshot.",
  action: (ss) => {
    const sheet = ss.sheet("sheetConfig");
    sheet.prepFetchConditionalFormatRules();
    ss.fetchAllPrepped();
    const idPrefix = sheet.column("idPrefix");
    const range = idPrefix.raw.dataGridRange;
    const before = rulesOver(sheet.conditionalFormatRules(), range);
    if (before.length !== 1) {
      return `Expected 1 ID prefix rule, found ${before.length}: ${JSON.stringify(before)}`;
    }
    const snapshot = Val.assert(before[0], "ID prefix rule snapshot");
    const declaration: ConditionalFormatDeclaration = {
      condition: {
        type: "CUSTOM_FORMULA",
        formula: `=${idPrefix.anchoredA1("idPrefixIsUniqueOrEmpty")}=FALSE`,
      },
      format: { backgroundColor: pink },
    };
    const declared: ConditionalFormatRule = {
      kind: "boolean",
      ranges: [range],
      ...declaration,
    };
    if (!conditionalFormatRulesEqual(snapshot, declared)) {
      return diffReport(
        "Declaration differs from the live rule; nothing queued.",
        {
          before: snapshot,
          declared,
        },
      );
    }
    idPrefix.removeConditionalFormatRule(snapshot);
    idPrefix.addConditionalFormatRule(declaration);
    ss.batchUpdateGSheets();
    sheet.prepFetchConditionalFormatRules();
    ss.fetchAllPrepped({ skipFetchingProperties: true });
    const after = rulesOver(sheet.conditionalFormatRules(), range);
    const afterRule = after[0];
    if (
      after.length === 1 &&
      afterRule !== undefined &&
      conditionalFormatRulesEqual(declared, afterRule)
    ) {
      return "ID prefix rule round-tripped with an empty diff.";
    }
    return diffReport("ID prefix rule re-read differed.", { declared, after });
  },
};

function rulesOver(
  rules: ConditionalFormatRule[],
  range: GridRangeProps,
): ConditionalFormatRule[] {
  return rules.filter(
    (rule) => rule.ranges.length === 1 && rangeEqual(range, rule.ranges[0]),
  );
}

function diffReport(heading: string, parts: Record<string, unknown>): string {
  return [
    heading,
    ...Object.entries(parts).map(
      ([label, value]) => `${label}: ${JSON.stringify(value)}`,
    ),
  ].join("\n");
}
