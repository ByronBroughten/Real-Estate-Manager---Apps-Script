import type { ColumnMetaRaw } from "../../02_SpreadsheetRaw/ColumnMetaRaw";
import type { SheetMetaRaw } from "../../02_SpreadsheetRaw/SheetMetaRaw";
import type { SpreadsheetNamed } from "../../04_SpreadsheetNamed/SpreadsheetNamed";
import type { Chore } from "../Chore";

const NUMBER_FORMAT_TO_COLUMN_TYPE: Record<string, string> = {
  TEXT: "TEXT",
  NUMBER: "DOUBLE",
  PERCENT: "PERCENT",
  CURRENCY: "CURRENCY",
  DATE: "DATE",
  TIME: "TIME",
  DATE_TIME: "DATE_TIME",
};

const COLUMN_TYPES_THIS_CHORE_SKIPS = new Set(["DROPDOWN"]);

export const setTestColumnTypesFromNumberFormat: Chore = {
  description:
    "On Test, promotes each untyped Table column whose first data row has a mappable number format to the matching column type.",
  action: (ss) => {
    const test = fetchTestWithProgrammaticFacts(ss);
    const { promotions, skipped } = promotionsAndSkips(test);
    if (promotions.length === 0) {
      return promotionSummary(promotions, skipped);
    }
    ss.raw.gatherRawRequest({
      updateTable: {
        table: {
          tableId: test.activeTable.tableId,
          columnProperties: columnPropertiesWithPromotions(test, promotions),
        },
        fields: "columnProperties",
      },
    });
    ss.batchUpdateGSheets();
    return promotionSummary(promotions, skipped);
  },
};

function fetchTestWithProgrammaticFacts(ss: SpreadsheetNamed): SheetMetaRaw {
  ss.fetchAllSheetProperties();
  const testRaw = ss.sheet("test").raw;
  testRaw.meta.tableHeaderRow.gatherFetchFull();
  testRaw.topRow.gatherFetchFull();
  ss.raw.fetchAllGathered(true);
  return testRaw.meta;
}

interface ColumnPromotion {
  colIndex: number;
  header: string;
  numberFormatType: string;
  columnType: string;
}

interface SkippedUntypedColumn {
  header: string;
  numberFormatType: string | undefined;
}

function promotionsAndSkips(test: SheetMetaRaw): {
  promotions: ColumnPromotion[];
  skipped: SkippedUntypedColumn[];
} {
  const promotions: ColumnPromotion[] = [];
  const skipped: SkippedUntypedColumn[] = [];
  test.fullTableColIndexes.forEach((colIndex) => {
    const column = test.column(colIndex);
    const promotion = promotionForColumn(column);
    if (promotion === "alreadyDeclared") return;
    if (promotion === null) {
      skipped.push({
        header: column.activeHeader,
        numberFormatType: column.activeNumberFormatType,
      });
      return;
    }
    promotions.push(promotion);
  });
  return { promotions, skipped };
}

function promotionForColumn(
  column: ColumnMetaRaw,
): ColumnPromotion | "alreadyDeclared" | null {
  if (column.activeDeclaredValueTitle() !== null) {
    return "alreadyDeclared";
  }
  const declaredColumnType = column.activeDeclaredColumnType;
  if (
    declaredColumnType !== undefined &&
    COLUMN_TYPES_THIS_CHORE_SKIPS.has(declaredColumnType)
  ) {
    return "alreadyDeclared";
  }
  const numberFormatType = column.activeNumberFormatType;
  if (numberFormatType === undefined) return null;
  const columnType = NUMBER_FORMAT_TO_COLUMN_TYPE[numberFormatType];
  if (columnType === undefined) return null;
  return {
    colIndex: column.colIndex,
    header: column.activeHeader,
    numberFormatType,
    columnType,
  };
}

function columnPropertiesWithPromotions(
  test: SheetMetaRaw,
  promotions: ColumnPromotion[],
): GoogleAppsScript.Sheets.Schema.TableColumnProperties[] {
  const columnTypeByColIndex = new Map(
    promotions.map((promotion) => [promotion.colIndex, promotion.columnType]),
  );
  const { startColumnIndex } = test.activeTable;
  return test.fullTableColIndexes.map((colIndex) => {
    const column = test.column(colIndex);
    const columnType =
      columnTypeByColIndex.get(colIndex) ?? column.activeDeclaredColumnType;
    const columnProperties: GoogleAppsScript.Sheets.Schema.TableColumnProperties =
      {
        columnIndex: colIndex - startColumnIndex,
        columnName: column.activeHeader,
      };
    if (columnType !== undefined) {
      columnProperties.columnType = columnType;
    }
    const validationStrings = column.valueValidationStrings;
    if (validationStrings.length > 0) {
      columnProperties.dataValidationRule = {
        condition: {
          type: "ONE_OF_LIST",
          values: validationStrings.map((userEnteredValue) => ({
            userEnteredValue,
          })),
        },
      };
    }
    return columnProperties;
  });
}

function promotionSummary(
  promotions: ColumnPromotion[],
  skipped: SkippedUntypedColumn[],
): string {
  let promotionLines: string;
  if (promotions.length === 0) {
    promotionLines = "Nothing to promote on Test.";
  } else {
    promotionLines = `Promote ${promotions.length} Test column(s):\n${promotions
      .map(
        (promotion) =>
          `  ${promotion.header}: ${promotion.numberFormatType} → ${promotion.columnType}`,
      )
      .join("\n")}`;
  }
  if (skipped.length === 0) return promotionLines;
  const skipLines = skipped
    .map(
      (column) =>
        `  ${column.header}: ${column.numberFormatType ?? "no number format"}`,
    )
    .join("\n");
  return `${promotionLines}\nSkipped untyped (no mappable number format):\n${skipLines}`;
}
