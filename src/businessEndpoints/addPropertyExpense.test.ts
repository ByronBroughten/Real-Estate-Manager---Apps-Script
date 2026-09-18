import { beforeEach, describe, expect, it } from "vitest";
import { columnConfigs } from "../01_SpreadsheetSchema/generated/columnConfigs";
import { sheetConfigs } from "../01_SpreadsheetSchema/generated/sheetConfigs";
import { SpreadsheetBaseNamed } from "../04_SpreadsheetNamed/ClassBases/SpreadsheetBaseNamed";
import { EndpointRun } from "../06_API/EndpointRun";
import {
  stubLogger,
  stubPropertiesService,
} from "../testSupport/fakeAppsScriptGlobals";
import {
  buildGridRows,
  stubSheetsService,
  type FakeCell,
  type FakeSheetProperties,
} from "../testSupport/fakeSheetsService";
import { Val } from "../utils/Val";
import { addPropertyExpense } from "./addPropertyExpense";

type BatchUpdateCall =
  GoogleAppsScript.Sheets.Schema.BatchUpdateSpreadsheetRequest;
interface ColumnFixture {
  columnId: string;
  header: string;
}
type WrittenValue = string | number | boolean | null;
type FakeRow<C> = Partial<Record<keyof C, FakeCell>>;
type WrittenRow = Record<string, WrittenValue>;

const topDataRowIndex = 4;
const stagingGid = sheetConfigs.addPropertyExpense.sheetGid;
const expenseGid = sheetConfigs.propertyExpense.sheetGid;
const receiptGid = sheetConfigs.splitReceipt.sheetGid;

const caseProperty = "r:prp:case";
const caseName = "140 Case";
const charlesProperty = "r:prp:charles";
const charlesName = "282 Charles";
const caseUnit = "r:unt:caseOne";
const caseUnitName = "140 Case, Unit 1";
const charlesUnit = "r:unt:charlesOne";
const charlesUnitName = "282 Charles, Unit 1";

const hardwareReceipt = "r:srct:hardware";
const hardwareReceiptName = "Hardware store, 3 Mar";
const lumberReceiptName = "Lumber yard, 4 Mar";

const dayOne = 45000;

const stagingColumnNames = [
  "date",
  "propertyName",
  "unitName",
  "billerName",
  "description",
  "amount",
  "expenseCategory",
  "taxAdjust",
  "receiptFormat",
  "notes",
  "runStatus",
  "splitReceiptName",
  "isUpfrontInvestment",
] as const;

const expenseColumnNames = [
  "expenseName",
  "id",
  "propertyId",
  "date",
  "year",
  "propertyYearId",
  "unitId",
  "billerName",
  "description",
  "expenseCategory",
  "receiptFormat",
  "amount",
  "taxDeductibleAmount",
  "taxAdjust",
  "isUpfrontInvestment",
  "notes",
  "splitReceiptId",
] as const;

const stagingRunStatusColIndex = stagingColumnNames.indexOf("runStatus");
const receiptIdColIndex = 1;

interface SheetStubProps<C> {
  sheetName: keyof typeof sheetConfigs;
  config: C;
  columnNames: readonly (keyof C)[];
  dataRows: readonly FakeRow<C>[];
  // The title, not the config name, is what a refusal message quotes.
  title?: string;
}

function stubSheet<C extends Record<string, ColumnFixture>>({
  sheetName,
  config,
  columnNames,
  dataRows,
  title = sheetName,
}: SheetStubProps<C>): FakeSheetProperties {
  const columnOf = (columnName: keyof C): ColumnFixture =>
    Val.assert(config[columnName], `column "${String(columnName)}"`);
  return {
    sheetId: sheetConfigs[sheetName].sheetGid,
    title,
    rows: buildGridRows({
      0: columnNames.map((columnName) => columnOf(columnName).columnId),
      3: columnNames.map((columnName) => columnOf(columnName).header),
      ...Object.fromEntries(
        dataRows.map((row, index) => [
          topDataRowIndex + index,
          columnNames.map((columnName) => row[columnName] ?? null),
        ]),
      ),
    }),
    table: { endRowIndex: topDataRowIndex + dataRows.length },
  };
}

type StagingRow = FakeRow<typeof columnConfigs.addPropertyExpense>;

// Everything a person must type, so a test only has to say what it varies.
function typedRow(overrides: StagingRow = {}): StagingRow {
  return {
    date: dayOne,
    billerName: "Ace Hardware",
    description: "Furnace filters",
    amount: 24,
    expenseCategory: "Supplies",
    receiptFormat: "Physical",
    isUpfrontInvestment: false,
    ...overrides,
  };
}

function stubStaging(dataRows: readonly StagingRow[]): FakeSheetProperties {
  return stubSheet({
    sheetName: "addPropertyExpense",
    config: columnConfigs.addPropertyExpense,
    columnNames: stagingColumnNames,
    dataRows,
  });
}

function stubProperty(dataRows?: readonly FakeRow<typeof columnConfigs.property>[]) {
  return stubSheet({
    sheetName: "property",
    title: "Property",
    config: columnConfigs.property,
    columnNames: ["name", "id"],
    dataRows:
      dataRows ??
      [
        { name: caseName, id: caseProperty },
        { name: charlesName, id: charlesProperty },
      ],
  });
}

function stubUnit() {
  return stubSheet({
    sheetName: "unit",
    title: "Unit",
    config: columnConfigs.unit,
    columnNames: ["name", "id", "propertyId"],
    dataRows: [
      { name: caseUnitName, id: caseUnit, propertyId: caseProperty },
      { name: charlesUnitName, id: charlesUnit, propertyId: charlesProperty },
    ],
  });
}

// The second receipt has no id yet, which the run is expected to mint.
function stubSplitReceipt() {
  return stubSheet({
    sheetName: "splitReceipt",
    title: "Split Receipt",
    config: columnConfigs.splitReceipt,
    columnNames: ["name", "id"],
    dataRows: [
      { name: hardwareReceiptName, id: hardwareReceipt },
      { name: lumberReceiptName },
    ],
  });
}

// Two rows, so an append can never collapse into a blank-row reuse.
function stubPropertyExpense() {
  return stubSheet({
    sheetName: "propertyExpense",
    config: columnConfigs.propertyExpense,
    columnNames: expenseColumnNames,
    dataRows: [
      { id: "r:pex:old", propertyId: caseProperty, date: 44000, amount: 10 },
      { id: "r:pex:older", propertyId: charlesProperty, date: 44001, amount: 20 },
    ],
  });
}

interface ExpenseSpreadsheetProps {
  stagingRows: readonly StagingRow[];
  properties?: readonly FakeRow<typeof columnConfigs.property>[];
}

function stubExpenseSpreadsheet({
  stagingRows,
  properties,
}: ExpenseSpreadsheetProps) {
  return stubSheetsService({
    sheets: [
      stubStaging(stagingRows),
      stubProperty(properties),
      stubUnit(),
      stubSplitReceipt(),
      stubPropertyExpense(),
    ],
  });
}

function runAddPropertyExpense(): void {
  const run = new EndpointRun({
    ...SpreadsheetBaseNamed.initSpreadsheetNamedProps(),
    sheetName: "addPropertyExpense",
    entryColumnName: "runStatus",
    endpoint: addPropertyExpense,
  });
  run.sheet.indexed.meta.ensureColumnIdsAreFetched();
  run.run(true);
}

function allRequests(calls: BatchUpdateCall[]) {
  return calls.flatMap((call) => call.requests ?? []);
}

function writtenValue(
  value: GoogleAppsScript.Sheets.Schema.ExtendedValue | undefined,
): WrittenValue {
  if (!value) return null;
  return (
    value.stringValue ??
    value.numberValue ??
    value.boolValue ??
    value.formulaValue ??
    null
  );
}

// Requests apply in order, so the last write to a cell is what the sheet ends up holding.
function cellsWrittenTo(
  calls: BatchUpdateCall[],
  sheetGid: number,
): Map<number, Map<number, WrittenValue>> {
  return allRequests(calls).reduce((rows, request) => {
    const range = request.updateCells?.range;
    if (!range || range.sheetId !== sheetGid) return rows;
    const rowIndex = range.startRowIndex ?? 0;
    const row = rows.get(rowIndex) ?? new Map<number, WrittenValue>();
    row.set(
      range.startColumnIndex ?? 0,
      writtenValue(
        request.updateCells?.rows?.[0]?.values?.[0]?.userEnteredValue,
      ),
    );
    return rows.set(rowIndex, row);
  }, new Map<number, Map<number, WrittenValue>>());
}

function rowsWrittenTo(
  calls: BatchUpdateCall[],
  sheetGid: number,
  columnNames: readonly string[],
): Map<number, WrittenRow> {
  return [...cellsWrittenTo(calls, sheetGid).entries()]
    .sort(([a], [b]) => a - b)
    .reduce((rows, [rowIndex, cells]) => {
      const row = columnNames.reduce<WrittenRow>(
        (written, columnName, colIndex) => {
          const value = cells.get(colIndex);
          if (value !== undefined) written[columnName] = value;
          return written;
        },
        {},
      );
      return rows.set(rowIndex, row);
    }, new Map<number, WrittenRow>());
}

// The minted id is random, so it is asserted by shape where it matters instead.
function expensesAppended(calls: BatchUpdateCall[]): WrittenRow[] {
  return [...rowsWrittenTo(calls, expenseGid, expenseColumnNames).values()].map(
    ({ id: _id, ...expense }) => expense,
  );
}

function stagingRowsWritten(calls: BatchUpdateCall[]): Map<number, WrittenRow> {
  const rows = rowsWrittenTo(calls, stagingGid, stagingColumnNames);
  [...rows.keys()]
    .filter((rowIndex) => rowIndex < topDataRowIndex)
    .forEach((rowIndex) => rows.delete(rowIndex));
  return rows;
}

function rowMessages(calls: BatchUpdateCall[]): Map<number, WrittenValue> {
  return [...cellsWrittenTo(calls, stagingGid).entries()]
    .filter(([rowIndex]) => rowIndex >= topDataRowIndex)
    .reduce((messages, [rowIndex, cells]) => {
      const message = cells.get(stagingRunStatusColIndex);
      if (message === undefined) return messages;
      return messages.set(rowIndex, message);
    }, new Map<number, WrittenValue>());
}

function stagingRowsDeleted(calls: BatchUpdateCall[]): number[] {
  return allRequests(calls).flatMap((request) => {
    const deleted = request.deleteDimension?.range;
    if (deleted?.sheetId !== stagingGid) return [];
    return [Val.assert(deleted.startIndex, "deleted row index")];
  });
}

function runStatusWritten(calls: BatchUpdateCall[]): string | undefined {
  return allRequests(calls)
    .map((request) => request.repeatCell?.cell?.userEnteredValue?.stringValue)
    .filter((value) => value !== undefined)
    .at(-1);
}

function runStateColour(calls: BatchUpdateCall[]) {
  return allRequests(calls)
    .map((request) => request.repeatCell?.cell?.userEnteredFormat?.backgroundColor)
    .filter((colour) => colour !== undefined)
    .at(-1);
}

const warningColour = { red: 0.99, green: 0.85, blue: 0.7 };

beforeEach(() => {
  stubPropertiesService({ realEstateSpreadsheetId: "test-spreadsheet-id" });
  stubLogger();
});

describe("addPropertyExpense, a mixed batch", () => {
  const mixedBatch = [
    typedRow({ unitName: caseUnitName }),
    typedRow({ unitName: "140 Case, Unit 9" }),
    typedRow({ propertyName: charlesName, amount: null }),
  ];

  it("adds the good row and leaves the two bad ones where they are", () => {
    const { batchUpdateCalls } = stubExpenseSpreadsheet({
      stagingRows: mixedBatch,
    });

    runAddPropertyExpense();

    expect(expensesAppended(batchUpdateCalls)).toEqual([
      {
        propertyId: caseProperty,
        unitId: caseUnit,
        splitReceiptId: "",
        date: dayOne,
        billerName: "Ace Hardware",
        description: "Furnace filters",
        amount: 24,
        expenseCategory: "Supplies",
        receiptFormat: "Physical",
        taxAdjust: "",
        isUpfrontInvestment: false,
        notes: "",
      },
    ]);
    expect(stagingRowsDeleted(batchUpdateCalls)).toEqual([topDataRowIndex]);
  });

  it("tells each refused row what is wrong with it, in its own cell", () => {
    const { batchUpdateCalls } = stubExpenseSpreadsheet({
      stagingRows: mixedBatch,
    });

    runAddPropertyExpense();

    expect([...rowMessages(batchUpdateCalls).entries()]).toEqual([
      [
        topDataRowIndex + 1,
        'This row was not added: no row of Unit is named "140 Case, Unit 9".',
      ],
      [topDataRowIndex + 2, "This row was not added: Amount is blank."],
    ]);
  });

  it("ends in the warning state, saying how much of the batch went through", () => {
    const { batchUpdateCalls } = stubExpenseSpreadsheet({
      stagingRows: mixedBatch,
    });

    runAddPropertyExpense();

    expect(runStatusWritten(batchUpdateCalls)).toBe(
      "Added 1 of 3 rows; the rest say why in their own cells.",
    );
    expect(runStateColour(batchUpdateCalls)).toEqual(warningColour);
  });

  it("reads every input sheet in one fetch cycle of its own", () => {
    const { getByDataFilterCalls } = stubExpenseSpreadsheet({
      stagingRows: mixedBatch,
    });

    runAddPropertyExpense();

    expect(getByDataFilterCalls).toHaveLength(3);
  });
});

describe("addPropertyExpense, naming the property and the unit", () => {
  it("takes the property from the unit when only a unit is named", () => {
    const { batchUpdateCalls } = stubExpenseSpreadsheet({
      stagingRows: [typedRow({ unitName: charlesUnitName })],
    });

    runAddPropertyExpense();

    expect(expensesAppended(batchUpdateCalls)[0]).toMatchObject({
      propertyId: charlesProperty,
      unitId: charlesUnit,
    });
  });

  it("leaves the unit blank when only a property is named", () => {
    const { batchUpdateCalls } = stubExpenseSpreadsheet({
      stagingRows: [typedRow({ propertyName: caseName })],
    });

    runAddPropertyExpense();

    expect(expensesAppended(batchUpdateCalls)[0]).toMatchObject({
      propertyId: caseProperty,
      unitId: "",
    });
  });

  it("accepts a row naming a unit and that unit's own property", () => {
    const { batchUpdateCalls } = stubExpenseSpreadsheet({
      stagingRows: [
        typedRow({ unitName: caseUnitName, propertyName: caseName }),
      ],
    });

    runAddPropertyExpense();

    expect(expensesAppended(batchUpdateCalls)[0]).toMatchObject({
      propertyId: caseProperty,
      unitId: caseUnit,
    });
  });

  it("refuses a row whose unit and property disagree", () => {
    const { batchUpdateCalls } = stubExpenseSpreadsheet({
      stagingRows: [
        typedRow({ unitName: caseUnitName, propertyName: charlesName }),
      ],
    });

    runAddPropertyExpense();

    expect(expensesAppended(batchUpdateCalls)).toEqual([]);
    expect(rowMessages(batchUpdateCalls).get(topDataRowIndex)).toBe(
      'This row was not added: unit "140 Case, Unit 1" does not belong to property "282 Charles".',
    );
  });

  it("refuses a row naming neither a unit nor a property", () => {
    const { batchUpdateCalls } = stubExpenseSpreadsheet({
      stagingRows: [typedRow()],
    });

    runAddPropertyExpense();

    expect(rowMessages(batchUpdateCalls).get(topDataRowIndex)).toBe(
      "This row was not added: name a unit or a property.",
    );
  });

  it("refuses a name that matches more than one row, and says how many", () => {
    const { batchUpdateCalls } = stubExpenseSpreadsheet({
      stagingRows: [typedRow({ propertyName: caseName })],
      properties: [
        { name: caseName, id: caseProperty },
        { name: caseName, id: "r:prp:caseAgain" },
      ],
    });

    runAddPropertyExpense();

    expect(rowMessages(batchUpdateCalls).get(topDataRowIndex)).toBe(
      'This row was not added: 2 rows of Property are named "140 Case".',
    );
  });

  it("names both an unknown unit and an unknown property at once", () => {
    const { batchUpdateCalls } = stubExpenseSpreadsheet({
      stagingRows: [
        typedRow({ unitName: "140 Case, Unit 9", propertyName: "9 Nowhere" }),
      ],
    });

    runAddPropertyExpense();

    expect(rowMessages(batchUpdateCalls).get(topDataRowIndex)).toBe(
      'This row was not added: no row of Unit is named "140 Case, Unit 9"; no row of Property is named "9 Nowhere".',
    );
  });

  it("lists every fault on a row with more than one", () => {
    const { batchUpdateCalls } = stubExpenseSpreadsheet({
      stagingRows: [typedRow({ amount: null, description: null })],
    });

    runAddPropertyExpense();

    expect(rowMessages(batchUpdateCalls).get(topDataRowIndex)).toBe(
      "This row was not added: Description is blank; Amount is blank; name a unit or a property.",
    );
  });
});

describe("addPropertyExpense, the split receipt", () => {
  it("carries a named receipt's id across", () => {
    const { batchUpdateCalls } = stubExpenseSpreadsheet({
      stagingRows: [
        typedRow({
          propertyName: caseName,
          splitReceiptName: hardwareReceiptName,
        }),
      ],
    });

    runAddPropertyExpense();

    expect(expensesAppended(batchUpdateCalls)[0]).toMatchObject({
      splitReceiptId: hardwareReceipt,
    });
  });

  it("gives a receipt with no id one during the run, and uses it", () => {
    const { batchUpdateCalls } = stubExpenseSpreadsheet({
      stagingRows: [
        typedRow({
          propertyName: caseName,
          splitReceiptName: lumberReceiptName,
        }),
      ],
    });

    runAddPropertyExpense();

    const mintedId = cellsWrittenTo(batchUpdateCalls, receiptGid)
      .get(topDataRowIndex + 1)
      ?.get(receiptIdColIndex);
    expect(mintedId).toMatch(/^r:srct:/);
    expect(expensesAppended(batchUpdateCalls)[0]).toMatchObject({
      splitReceiptId: mintedId,
    });
  });
});

describe("addPropertyExpense, what the sheet is left holding", () => {
  it("empties the staging sheet to one blank row after a clean batch", () => {
    const { batchUpdateCalls } = stubExpenseSpreadsheet({
      stagingRows: [
        typedRow({ unitName: caseUnitName }),
        typedRow({ propertyName: charlesName }),
      ],
    });

    runAddPropertyExpense();

    expect(runStatusWritten(batchUpdateCalls)).toBe("Added 2 expenses.");
    expect(stagingRowsDeleted(batchUpdateCalls)).toEqual([topDataRowIndex]);
    expect(
      stagingRowsWritten(batchUpdateCalls).get(topDataRowIndex + 1),
    ).toEqual(
      Object.fromEntries(stagingColumnNames.map((columnName) => [columnName, ""])),
    );
  });

  it("says there was nothing to add when every row is blank", () => {
    const { batchUpdateCalls } = stubExpenseSpreadsheet({
      stagingRows: [{}],
    });

    runAddPropertyExpense();

    expect(runStatusWritten(batchUpdateCalls)).toBe(
      "There are no expenses to add.",
    );
    expect(expensesAppended(batchUpdateCalls)).toEqual([]);
    expect(stagingRowsDeleted(batchUpdateCalls)).toEqual([]);
  });
});
