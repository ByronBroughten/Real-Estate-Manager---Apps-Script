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
import { Dat } from "../utils/Dat";
import { Val } from "../utils/Val";
import { buildLedger } from "./buildLedger";

type BatchUpdateCall =
  GoogleAppsScript.Sheets.Schema.BatchUpdateSpreadsheetRequest;
interface ColumnFixture {
  columnId: string;
  header: string;
}
type WrittenValue = string | number | boolean | null;
type FakeRow<C> = Partial<Record<keyof C, FakeCell>>;

const topDataRowIndex = 4;
const ledgerGid = sheetConfigs.occupancyLedger.sheetGid;
const variableGid = sheetConfigs.variable.sheetGid;
const ledgerColumnCount = 7;
const amountOwedColIndex = 5;

const tenant = "r:occ:tenant";
const tenantName = "Reiona`282 Charles, Unit 1";
const neighbour = "r:occ:neighbour";
const newcomer = "r:occ:newcomer";
const newcomerName = "Alanna`140 Case, Unit 1";

const rentCharge = "r:och:rent";
const depositCharge = "r:och:deposit";
const damageCharge = "r:och:damage";
const neighbourCharge = "r:och:neighbour";

const dayOne = 45000;
const dayTwo = 45010;
const dayThree = 45020;

interface SheetStubProps<C> {
  sheetName: keyof typeof sheetConfigs;
  config: C;
  columnNames: readonly (keyof C)[];
  dataRows: readonly FakeRow<C>[];
}

function stubSheet<C extends Record<string, ColumnFixture>>({
  sheetName,
  config,
  columnNames,
  dataRows,
}: SheetStubProps<C>): FakeSheetProperties {
  const columnOf = (columnName: keyof C): ColumnFixture =>
    Val.assert(config[columnName], `column "${String(columnName)}"`);
  return {
    sheetId: sheetConfigs[sheetName].sheetGid,
    title: sheetName,
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

function stubOccupancy(
  selectedOccupancyId: string,
  startDates: Partial<Record<string, number>> = {},
) {
  return stubSheet({
    sheetName: "occupancy",
    config: columnConfigs.occupancy,
    columnNames: [
      "id",
      "name",
      "buildLedgerStartDate",
      "buildLedgerSelect",
      "buildLedgerTimeLastRan",
      "buildLedgerRunStatus",
    ],
    dataRows: [
      {
        id: tenant,
        name: tenantName,
        buildLedgerStartDate: startDates[tenant],
        buildLedgerSelect: selectedOccupancyId === tenant,
      },
      {
        id: neighbour,
        name: "Someone Else`99 Elsewhere, Unit 2",
        buildLedgerStartDate: startDates[neighbour],
        buildLedgerSelect: selectedOccupancyId === neighbour,
      },
      {
        id: newcomer,
        name: newcomerName,
        buildLedgerStartDate: startDates[newcomer],
        buildLedgerSelect: selectedOccupancyId === newcomer,
      },
    ],
  });
}

type ChargeRow = FakeRow<typeof columnConfigs.occCharge>;

const chargeRows: ChargeRow[] = [
  {
    id: rentCharge,
    occupancyId: tenant,
    date: dayOne,
    description: "Rent (base)",
    amount: 50,
  },
  {
    id: depositCharge,
    occupancyId: tenant,
    date: dayOne,
    description: "Security deposit",
    amount: 1100,
  },
  {
    id: damageCharge,
    occupancyId: tenant,
    date: dayTwo,
    description: "Damage, waste, or service",
    amount: 220,
    notes: "Plumber cost",
  },
  {
    id: neighbourCharge,
    occupancyId: neighbour,
    date: dayOne,
    description: "Rent (base)",
    amount: 999,
  },
];

function stubOccCharge(dataRows: ChargeRow[] = chargeRows) {
  return stubSheet({
    sheetName: "occCharge",
    config: columnConfigs.occCharge,
    columnNames: [
      "id",
      "occupancyId",
      "date",
      "description",
      "amount",
      "notes",
    ],
    dataRows,
  });
}

// The third reduces a charge of the neighbour's; the fourth is the sheet's blank row.
function stubOccChargeReduce() {
  return stubSheet({
    sheetName: "occChargeReduce",
    config: columnConfigs.occChargeReduce,
    columnNames: ["chargeId", "date", "description", "amount"],
    dataRows: [
      {
        chargeId: damageCharge,
        date: dayThree,
        description: "Forgiveness",
        amount: 110,
      },
      {
        chargeId: damageCharge,
        date: dayThree,
        description: "Security deposit",
        amount: 110,
      },
      {
        chargeId: neighbourCharge,
        date: dayThree,
        description: "Forgiveness",
        amount: 999,
      },
      {},
    ],
  });
}

type AllocationRow = FakeRow<typeof columnConfigs.occPayAllocation>;

// The first two are one payment split across two charges; the last two must not appear.
const allocationRows: AllocationRow[] = [
  {
    paymentId: "r:opy:rentAndDeposit",
    occupancyId: tenant,
    filledOut: true,
    formOfPayment: "Payment",
    payerCategory: "Household",
    payerName: tenantName,
    paymentDate: dayOne,
    amount: 50,
    chargeDescription: "Rent (base)",
  },
  {
    paymentId: "r:opy:rentAndDeposit",
    occupancyId: tenant,
    filledOut: true,
    formOfPayment: "Payment",
    payerCategory: "Household",
    payerName: tenantName,
    paymentDate: dayOne,
    amount: 1100,
    chargeDescription: "Security deposit",
  },
  {
    paymentId: "r:opy:caretaking",
    occupancyId: tenant,
    filledOut: true,
    formOfPayment: "Caretaking",
    payerCategory: "Household",
    payerName: tenantName,
    paymentDate: dayTwo,
    amount: 25,
    chargeDescription: "Rent (base)",
  },
  {
    paymentId: "r:opy:agency",
    occupancyId: tenant,
    filledOut: true,
    formOfPayment: "Payment",
    payerCategory: "Non-occupant",
    payerName: "Ramsey County",
    paymentDate: dayTwo,
    amount: 200,
    chargeDescription: "Damage, waste, or service",
  },
  {
    paymentId: "r:opy:halfEntered",
    occupancyId: tenant,
    filledOut: false,
    formOfPayment: "Payment",
    payerCategory: "Household",
    payerName: tenantName,
    paymentDate: dayTwo,
    amount: 77,
    chargeDescription: "Rent (base)",
  },
  {
    paymentId: "r:opy:neighbour",
    occupancyId: neighbour,
    filledOut: true,
    formOfPayment: "Payment",
    payerCategory: "Household",
    payerName: "Someone Else`99 Elsewhere, Unit 2",
    paymentDate: dayTwo,
    amount: 888,
    chargeDescription: "Rent (base)",
  },
];

function stubOccPayAllocation(dataRows: AllocationRow[] = allocationRows) {
  return stubSheet({
    sheetName: "occPayAllocation",
    config: columnConfigs.occPayAllocation,
    columnNames: [
      "paymentId",
      "occupancyId",
      "filledOut",
      "formOfPayment",
      "payerCategory",
      "payerName",
      "paymentDate",
      "amount",
      "chargeDescription",
    ],
    dataRows,
  });
}

function stubVariable() {
  return stubSheet({
    sheetName: "variable",
    config: columnConfigs.variable,
    columnNames: ["occupancyLedgerOccId", "occupancyLedgerDateRan"],
    dataRows: [
      { occupancyLedgerOccId: "r:occ:stale", occupancyLedgerDateRan: 44000 },
    ],
  });
}

// Three rows of a previous run's ledger, so the rebuild has something to wipe.
function stubOccupancyLedger() {
  const staleRow = {
    date: dayOne,
    issuer: "Property management",
    description: "Stale",
    charge: 1,
    payment: "",
    amountOwed: 1,
    notes: "",
  };
  return stubSheet({
    sheetName: "occupancyLedger",
    config: columnConfigs.occupancyLedger,
    columnNames: [
      "date",
      "issuer",
      "description",
      "charge",
      "payment",
      "amountOwed",
      "notes",
    ],
    dataRows: [staleRow, staleRow, staleRow],
  });
}

interface LedgerSpreadsheetProps {
  selectedOccupancyId?: string;
  charges?: ChargeRow[];
  allocations?: AllocationRow[];
  startDates?: Partial<Record<string, number>>;
}

function stubLedgerSpreadsheet({
  selectedOccupancyId = tenant,
  charges = chargeRows,
  allocations = allocationRows,
  startDates = {},
}: LedgerSpreadsheetProps = {}) {
  return stubSheetsService({
    sheets: [
      stubOccupancy(selectedOccupancyId, startDates),
      stubOccCharge(charges),
      stubOccChargeReduce(),
      stubOccPayAllocation(allocations),
      stubVariable(),
      stubOccupancyLedger(),
    ],
  });
}

function runBuildLedger(): void {
  const run = new EndpointRun({
    ...SpreadsheetBaseNamed.initSpreadsheetNamedProps(),
    sheetName: "occupancy",
    entryColumnName: "buildLedgerTimeLastRan",
    endpoint: buildLedger,
  });
  run.sheet.identified.meta.ensureColumnIdsAreFetched();
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

function ledgerRowsWritten(calls: BatchUpdateCall[]): WrittenValue[][] {
  return [...cellsWrittenTo(calls, ledgerGid).entries()]
    .sort(([a], [b]) => a - b)
    .map(([, row]) =>
      [...Array(ledgerColumnCount).keys()].map(
        (colIndex) => row.get(colIndex) ?? null,
      ),
    );
}

function ledgerRowShapeRequests(calls: BatchUpdateCall[]): string[] {
  return allRequests(calls).flatMap((request) => {
    if (request.appendCells?.sheetId === ledgerGid) {
      return [`append ${String(request.appendCells.rows?.length ?? 0)}`];
    }
    const deleted = request.deleteDimension?.range;
    if (deleted?.sheetId !== ledgerGid) return [];
    return [`delete ${String(deleted.startIndex)}`];
  });
}

function runStatusWritten(calls: BatchUpdateCall[]): string | undefined {
  return allRequests(calls)
    .map((request) => request.repeatCell?.cell?.userEnteredValue?.stringValue)
    .filter((value) => value !== undefined)
    .at(-1);
}

beforeEach(() => {
  stubPropertiesService({ realEstateSpreadsheetId: "test-spreadsheet-id" });
  stubLogger();
});

describe("buildLedger, the page it writes", () => {
  it("writes every kind of line in date order, charge before payment on a shared day", () => {
    const { batchUpdateCalls } = stubLedgerSpreadsheet();

    runBuildLedger();

    expect(ledgerRowsWritten(batchUpdateCalls)).toEqual([
      [dayOne, "Property management", "Rent (base)", 50, "", null, ""],
      [dayOne, "Property management", "Security deposit", 1100, "", null, ""],
      [dayOne, "Household", "Payment", "", 1150, null, ""],
      [
        dayTwo,
        "Property management",
        "Damage, waste, or service",
        220,
        "",
        null,
        "Plumber cost",
      ],
      [dayTwo, "Household", "Caretaking", "", 25, null, ""],
      [dayTwo, "Ramsey County", "Payment", "", 200, null, ""],
      [dayThree, "Property management", "Forgiveness", -110, "", null, ""],
      [
        dayThree,
        "Security deposit",
        "Damage, waste, or service",
        "",
        110,
        null,
        "",
      ],
    ]);
  });

  it("keeps a household payment's form of payment when the whole amount funds the deposit", () => {
    const { batchUpdateCalls } = stubLedgerSpreadsheet({
      charges: [
        {
          id: depositCharge,
          occupancyId: tenant,
          date: dayOne,
          description: "Security deposit",
          amount: 1100,
        },
      ],
      allocations: [
        {
          paymentId: "r:opy:deposit",
          occupancyId: tenant,
          filledOut: true,
          formOfPayment: "Payment",
          payerCategory: "Household",
          payerName: tenantName,
          paymentDate: dayOne,
          amount: 875,
          chargeDescription: "Security deposit",
        },
      ],
    });

    runBuildLedger();

    expect(ledgerRowsWritten(batchUpdateCalls)).toEqual([
      [dayOne, "Property management", "Security deposit", 1100, "", null, ""],
      [dayOne, "Household", "Payment", "", 875, null, ""],
    ]);
  });

  it("leaves the amount owed column to the sheet's own formula", () => {
    const { batchUpdateCalls } = stubLedgerSpreadsheet();

    runBuildLedger();

    expect(
      ledgerRowsWritten(batchUpdateCalls).map((row) => row[amountOwedColIndex]),
    ).toEqual([null, null, null, null, null, null, null, null]);
  });

  it("wipes the previous ledger down to one row and refills from there", () => {
    const { batchUpdateCalls } = stubLedgerSpreadsheet();

    runBuildLedger();

    expect(ledgerRowShapeRequests(batchUpdateCalls)).toEqual([
      "append 7",
      "delete 6",
      "delete 5",
    ]);
  });

  it("stamps the occupancy and the day it ran into the Variable sheet", () => {
    const { batchUpdateCalls } = stubLedgerSpreadsheet({
      startDates: { [tenant]: dayTwo },
    });

    runBuildLedger();

    expect([
      ...cellsWrittenTo(batchUpdateCalls, variableGid).entries(),
    ]).toEqual([
      [
        topDataRowIndex,
        new Map<number, WrittenValue>([
          [0, tenant],
          [1, Dat.today()],
        ]),
      ],
    ]);
  });

  it("reads every input sheet in one fetch cycle of its own", () => {
    const { getByDataFilterCalls } = stubLedgerSpreadsheet();

    runBuildLedger();

    expect(getByDataFilterCalls).toHaveLength(4);
  });

  it("opens a cut page with a prior balance, then only lines on or after the start date", () => {
    const { batchUpdateCalls } = stubLedgerSpreadsheet({
      startDates: { [tenant]: dayTwo },
    });

    runBuildLedger();

    expect(ledgerRowsWritten(batchUpdateCalls)).toEqual([
      [dayTwo, "Property management", "Prior balance", 0, "", null, ""],
      [
        dayTwo,
        "Property management",
        "Damage, waste, or service",
        220,
        "",
        null,
        "Plumber cost",
      ],
      [dayTwo, "Household", "Caretaking", "", 25, null, ""],
      [dayTwo, "Ramsey County", "Payment", "", 200, null, ""],
      [dayThree, "Property management", "Forgiveness", -110, "", null, ""],
      [
        dayThree,
        "Security deposit",
        "Damage, waste, or service",
        "",
        110,
        null,
        "",
      ],
    ]);
  });

  it("keeps a charge on the start date as its own line after the prior balance", () => {
    const { batchUpdateCalls } = stubLedgerSpreadsheet({
      startDates: { [tenant]: dayTwo },
    });

    runBuildLedger();

    const rows = ledgerRowsWritten(batchUpdateCalls);
    expect(rows[0]?.[2]).toBe("Prior balance");
    expect(rows[1]?.[2]).toBe("Damage, waste, or service");
    expect(rows[1]?.[0]).toBe(dayTwo);
  });

  it("writes the full ledger with no prior balance when the start date is before every line", () => {
    const { batchUpdateCalls } = stubLedgerSpreadsheet({
      startDates: { [tenant]: dayOne - 1 },
    });

    runBuildLedger();

    expect(ledgerRowsWritten(batchUpdateCalls).map((row) => row[2])).toEqual([
      "Rent (base)",
      "Security deposit",
      "Payment",
      "Damage, waste, or service",
      "Caretaking",
      "Payment",
      "Forgiveness",
      "Damage, waste, or service",
    ]);
  });

  it("is only the prior balance when the start date is after every line", () => {
    const { batchUpdateCalls } = stubLedgerSpreadsheet({
      startDates: { [tenant]: dayThree + 1 },
    });

    runBuildLedger();

    expect(ledgerRowsWritten(batchUpdateCalls)).toEqual([
      [
        dayThree + 1,
        "Property management",
        "Prior balance",
        -225,
        "",
        null,
        "",
      ],
    ]);
  });

  it("still shows a $0 prior balance when history is paid", () => {
    const { batchUpdateCalls } = stubLedgerSpreadsheet({
      startDates: { [tenant]: dayTwo },
      charges: [
        {
          id: depositCharge,
          occupancyId: tenant,
          date: dayOne,
          description: "Security deposit",
          amount: 1100,
        },
      ],
      allocations: [
        {
          paymentId: "r:opy:deposit",
          occupancyId: tenant,
          filledOut: true,
          formOfPayment: "Payment",
          payerCategory: "Household",
          payerName: tenantName,
          paymentDate: dayOne,
          amount: 1100,
          chargeDescription: "Security deposit",
        },
      ],
    });

    runBuildLedger();

    expect(ledgerRowsWritten(batchUpdateCalls)).toEqual([
      [dayTwo, "Property management", "Prior balance", 0, "", null, ""],
    ]);
  });
});

describe("buildLedger, what it reports", () => {
  it("counts the lines it put on the page", () => {
    const { batchUpdateCalls } = stubLedgerSpreadsheet();

    runBuildLedger();

    expect(runStatusWritten(batchUpdateCalls)).toBe(
      `Built ledger for ${tenantName}: 3 charges, 3 payments, 2 reductions.`,
    );
  });

  it("drops the s from a count of one", () => {
    const { batchUpdateCalls } = stubLedgerSpreadsheet({
      charges: [
        {
          id: rentCharge,
          occupancyId: tenant,
          date: dayOne,
          description: "Rent (base)",
          amount: 50,
        },
      ],
      allocations: [
        {
          paymentId: "r:opy:rent",
          occupancyId: tenant,
          filledOut: true,
          formOfPayment: "Payment",
          payerCategory: "Household",
          payerName: tenantName,
          paymentDate: dayOne,
          amount: 50,
          chargeDescription: "Rent (base)",
        },
      ],
    });

    runBuildLedger();

    expect(runStatusWritten(batchUpdateCalls)).toBe(
      `Built ledger for ${tenantName}: 1 charge, 1 payment, 0 reductions.`,
    );
  });

  it("names the start date in the run status and ignores the prior balance in the counts", () => {
    const { batchUpdateCalls } = stubLedgerSpreadsheet({
      startDates: { [tenant]: dayTwo },
    });

    runBuildLedger();

    expect(runStatusWritten(batchUpdateCalls)).toBe(
      `Built ledger for ${tenantName}, from 25 Mar 2023: 1 charge, 2 payments, 2 reductions.`,
    );
  });

  it("reports a prior-balance-only window as a built page of zeroes", () => {
    const { batchUpdateCalls } = stubLedgerSpreadsheet({
      startDates: { [tenant]: dayThree + 1 },
    });

    runBuildLedger();

    expect(runStatusWritten(batchUpdateCalls)).toBe(
      `Built ledger for ${tenantName}, from 5 Apr 2023: 0 charges, 0 payments, 0 reductions.`,
    );
  });

  it("still carries from in the run status when the start date is before every line", () => {
    const { batchUpdateCalls } = stubLedgerSpreadsheet({
      startDates: { [tenant]: dayOne - 1 },
    });

    runBuildLedger();

    expect(runStatusWritten(batchUpdateCalls)).toBe(
      `Built ledger for ${tenantName}, from 14 Mar 2023: 3 charges, 3 payments, 2 reductions.`,
    );
  });

  it("says so plainly when an occupancy has nothing billed or paid", () => {
    const { batchUpdateCalls } = stubLedgerSpreadsheet({
      selectedOccupancyId: newcomer,
      startDates: { [newcomer]: dayTwo },
    });

    runBuildLedger();

    expect(runStatusWritten(batchUpdateCalls)).toBe(
      `No charges or payments for ${newcomerName}.`,
    );
  });

  it("names the blank cell it hit and leaves the previous ledger alone", () => {
    const { batchUpdateCalls } = stubLedgerSpreadsheet({
      charges: [{ id: rentCharge, occupancyId: tenant, amount: 50 }],
    });

    runBuildLedger();

    expect(runStatusWritten(batchUpdateCalls)).toMatch(
      /"date".*"occCharge".*4/,
    );
    expect(ledgerRowsWritten(batchUpdateCalls)).toEqual([]);
    expect(ledgerRowShapeRequests(batchUpdateCalls)).toEqual([]);
  });
});
