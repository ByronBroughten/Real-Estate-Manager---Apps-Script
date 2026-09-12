import { beforeEach, describe, expect, it } from "vitest";
import { columnConfigs } from "../01_generatedConfigs/columnConfigs";
import { sheetConfigs } from "../01_generatedConfigs/sheetConfigs";
import { SpreadsheetNamedBase } from "../04_SpreadsheetNamed/ClassBases/SpreadsheetNamedBase";
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

const TOP_DATA_ROW_INDEX = 4;
const LEDGER_GID = sheetConfigs.occupancyLedger.sheetGid;
const VARIABLE_GID = sheetConfigs.variable.sheetGid;
const LEDGER_COLUMN_COUNT = 8;
const AMOUNT_OWED_COL_INDEX = 5;

const TENANT = "r:occ:tenant";
const TENANT_NAME = "Reiona`282 Charles, Unit 1";
const NEIGHBOUR = "r:occ:neighbour";
const NEWCOMER = "r:occ:newcomer";
const NEWCOMER_NAME = "Alanna`140 Case, Unit 1";

const RENT_CHARGE = "r:och:rent";
const DEPOSIT_CHARGE = "r:och:deposit";
const DAMAGE_CHARGE = "r:och:damage";
const NEIGHBOUR_CHARGE = "r:och:neighbour";

const DAY_ONE = 45000;
const DAY_TWO = 45010;
const DAY_THREE = 45020;

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
          TOP_DATA_ROW_INDEX + index,
          columnNames.map((columnName) => row[columnName] ?? null),
        ]),
      ),
    }),
    table: { endRowIndex: TOP_DATA_ROW_INDEX + dataRows.length },
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
        id: TENANT,
        name: TENANT_NAME,
        buildLedgerStartDate: startDates[TENANT],
        buildLedgerSelect: selectedOccupancyId === TENANT,
      },
      {
        id: NEIGHBOUR,
        name: "Someone Else`99 Elsewhere, Unit 2",
        buildLedgerStartDate: startDates[NEIGHBOUR],
        buildLedgerSelect: selectedOccupancyId === NEIGHBOUR,
      },
      {
        id: NEWCOMER,
        name: NEWCOMER_NAME,
        buildLedgerStartDate: startDates[NEWCOMER],
        buildLedgerSelect: selectedOccupancyId === NEWCOMER,
      },
    ],
  });
}

type ChargeRow = FakeRow<typeof columnConfigs.occCharge>;

const chargeRows: ChargeRow[] = [
  {
    id: RENT_CHARGE,
    occupancyId: TENANT,
    date: DAY_ONE,
    description: "Rent (base)",
    amount: 50,
  },
  {
    id: DEPOSIT_CHARGE,
    occupancyId: TENANT,
    date: DAY_ONE,
    description: "Security deposit",
    amount: 1100,
  },
  {
    id: DAMAGE_CHARGE,
    occupancyId: TENANT,
    date: DAY_TWO,
    description: "Damage, waste, or service",
    amount: 220,
    notes: "Plumber cost",
  },
  {
    id: NEIGHBOUR_CHARGE,
    occupancyId: NEIGHBOUR,
    date: DAY_ONE,
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
        chargeId: DAMAGE_CHARGE,
        date: DAY_THREE,
        description: "Forgiveness",
        amount: 110,
      },
      {
        chargeId: DAMAGE_CHARGE,
        date: DAY_THREE,
        description: "Security deposit",
        amount: 110,
      },
      {
        chargeId: NEIGHBOUR_CHARGE,
        date: DAY_THREE,
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
    occupancyId: TENANT,
    filledOut: "Yes",
    formOfPayment: "Payment",
    payerCategory: "Household",
    payerName: TENANT_NAME,
    paymentDate: DAY_ONE,
    amount: 50,
    chargeDescription: "Rent (base)",
  },
  {
    paymentId: "r:opy:rentAndDeposit",
    occupancyId: TENANT,
    filledOut: "Yes",
    formOfPayment: "Payment",
    payerCategory: "Household",
    payerName: TENANT_NAME,
    paymentDate: DAY_ONE,
    amount: 1100,
    chargeDescription: "Security deposit",
  },
  {
    paymentId: "r:opy:caretaking",
    occupancyId: TENANT,
    filledOut: "Yes",
    formOfPayment: "Caretaking",
    payerCategory: "Household",
    payerName: TENANT_NAME,
    paymentDate: DAY_TWO,
    amount: 25,
    chargeDescription: "Rent (base)",
  },
  {
    paymentId: "r:opy:agency",
    occupancyId: TENANT,
    filledOut: "Yes",
    formOfPayment: "Payment",
    payerCategory: "Non-resident",
    payerName: "Ramsey County",
    paymentDate: DAY_TWO,
    amount: 200,
    chargeDescription: "Damage, waste, or service",
  },
  {
    paymentId: "r:opy:halfEntered",
    occupancyId: TENANT,
    filledOut: "No",
    formOfPayment: "Payment",
    payerCategory: "Household",
    payerName: TENANT_NAME,
    paymentDate: DAY_TWO,
    amount: 77,
    chargeDescription: "Rent (base)",
  },
  {
    paymentId: "r:opy:neighbour",
    occupancyId: NEIGHBOUR,
    filledOut: "Yes",
    formOfPayment: "Payment",
    payerCategory: "Household",
    payerName: "Someone Else`99 Elsewhere, Unit 2",
    paymentDate: DAY_TWO,
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
    date: DAY_ONE,
    issuer: "Property management",
    description: "Stale",
    charge: 1,
    payment: "",
    amountOwed: 1,
    securityDeposit: "",
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
      "securityDeposit",
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
  selectedOccupancyId = TENANT,
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
    ...SpreadsheetNamedBase.initSpreadsheetNamedProps(),
    sheetName: "occupancy",
    entryColumnName: "buildLedgerTimeLastRan",
    endpoint: buildLedger,
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

function ledgerRowsWritten(calls: BatchUpdateCall[]): WrittenValue[][] {
  return [...cellsWrittenTo(calls, LEDGER_GID).entries()]
    .sort(([a], [b]) => a - b)
    .map(([, row]) =>
      [...Array(LEDGER_COLUMN_COUNT).keys()].map(
        (colIndex) => row.get(colIndex) ?? null,
      ),
    );
}

function ledgerRowShapeRequests(calls: BatchUpdateCall[]): string[] {
  return allRequests(calls).flatMap((request) => {
    if (request.appendCells?.sheetId === LEDGER_GID) {
      return [`append ${String(request.appendCells.rows?.length ?? 0)}`];
    }
    const deleted = request.deleteDimension?.range;
    if (deleted?.sheetId !== LEDGER_GID) return [];
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
      [DAY_ONE, "Property management", "Rent (base)", 50, "", null, "", ""],
      [
        DAY_ONE,
        "Property management",
        "Security deposit",
        1100,
        "",
        null,
        "",
        "",
      ],
      [DAY_ONE, "Household", "Payment", "", 1150, null, 1100, ""],
      [
        DAY_TWO,
        "Property management",
        "Damage, waste, or service",
        220,
        "",
        null,
        "",
        "Plumber cost",
      ],
      [DAY_TWO, "Household", "Caretaking", "", 25, null, "", ""],
      [DAY_TWO, "Ramsey County", "Payment", "", 200, null, "", ""],
      [DAY_THREE, "Property management", "Forgiveness", -110, "", null, "", ""],
      [
        DAY_THREE,
        "Security deposit",
        "Damage, waste, or service",
        "",
        110,
        null,
        990,
        "",
      ],
    ]);
  });

  it("names a household payment that funds the deposit as Security deposit", () => {
    const { batchUpdateCalls } = stubLedgerSpreadsheet({
      charges: [
        {
          id: DEPOSIT_CHARGE,
          occupancyId: TENANT,
          date: DAY_ONE,
          description: "Security deposit",
          amount: 1100,
        },
      ],
      allocations: [
        {
          paymentId: "r:opy:deposit",
          occupancyId: TENANT,
          filledOut: "Yes",
          formOfPayment: "Payment",
          payerCategory: "Household",
          payerName: TENANT_NAME,
          paymentDate: DAY_ONE,
          amount: 875,
          chargeDescription: "Security deposit",
        },
      ],
    });

    runBuildLedger();

    expect(ledgerRowsWritten(batchUpdateCalls)).toEqual([
      [
        DAY_ONE,
        "Property management",
        "Security deposit",
        1100,
        "",
        null,
        "",
        "",
      ],
      [DAY_ONE, "Household", "Security deposit", "", 875, null, 875, ""],
    ]);
  });

  it("leaves the amount owed column to the sheet's own formula", () => {
    const { batchUpdateCalls } = stubLedgerSpreadsheet();

    runBuildLedger();

    expect(
      ledgerRowsWritten(batchUpdateCalls).map(
        (row) => row[AMOUNT_OWED_COL_INDEX],
      ),
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
      startDates: { [TENANT]: DAY_TWO },
    });

    runBuildLedger();

    expect([
      ...cellsWrittenTo(batchUpdateCalls, VARIABLE_GID).entries(),
    ]).toEqual([
      [
        TOP_DATA_ROW_INDEX,
        new Map<number, WrittenValue>([
          [0, TENANT],
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
      startDates: { [TENANT]: DAY_TWO },
    });

    runBuildLedger();

    expect(ledgerRowsWritten(batchUpdateCalls)).toEqual([
      [
        DAY_TWO,
        "Property management",
        "Prior balance",
        0,
        "",
        null,
        1100,
        "",
      ],
      [
        DAY_TWO,
        "Property management",
        "Damage, waste, or service",
        220,
        "",
        null,
        "",
        "Plumber cost",
      ],
      [DAY_TWO, "Household", "Caretaking", "", 25, null, "", ""],
      [DAY_TWO, "Ramsey County", "Payment", "", 200, null, "", ""],
      [DAY_THREE, "Property management", "Forgiveness", -110, "", null, "", ""],
      [
        DAY_THREE,
        "Security deposit",
        "Damage, waste, or service",
        "",
        110,
        null,
        990,
        "",
      ],
    ]);
  });

  it("keeps a charge on the start date as its own line after the prior balance", () => {
    const { batchUpdateCalls } = stubLedgerSpreadsheet({
      startDates: { [TENANT]: DAY_TWO },
    });

    runBuildLedger();

    const rows = ledgerRowsWritten(batchUpdateCalls);
    expect(rows[0]?.[2]).toBe("Prior balance");
    expect(rows[1]?.[2]).toBe("Damage, waste, or service");
    expect(rows[1]?.[0]).toBe(DAY_TWO);
  });

  it("writes the full ledger with no prior balance when the start date is before every line", () => {
    const { batchUpdateCalls } = stubLedgerSpreadsheet({
      startDates: { [TENANT]: DAY_ONE - 1 },
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
      startDates: { [TENANT]: DAY_THREE + 1 },
    });

    runBuildLedger();

    expect(ledgerRowsWritten(batchUpdateCalls)).toEqual([
      [
        DAY_THREE + 1,
        "Property management",
        "Prior balance",
        -225,
        "",
        null,
        990,
        "",
      ],
    ]);
  });

  it("still shows a $0 prior balance when history is paid and the deposit is held", () => {
    const { batchUpdateCalls } = stubLedgerSpreadsheet({
      startDates: { [TENANT]: DAY_TWO },
      charges: [
        {
          id: DEPOSIT_CHARGE,
          occupancyId: TENANT,
          date: DAY_ONE,
          description: "Security deposit",
          amount: 1100,
        },
      ],
      allocations: [
        {
          paymentId: "r:opy:deposit",
          occupancyId: TENANT,
          filledOut: "Yes",
          formOfPayment: "Payment",
          payerCategory: "Household",
          payerName: TENANT_NAME,
          paymentDate: DAY_ONE,
          amount: 1100,
          chargeDescription: "Security deposit",
        },
      ],
    });

    runBuildLedger();

    expect(ledgerRowsWritten(batchUpdateCalls)).toEqual([
      [
        DAY_TWO,
        "Property management",
        "Prior balance",
        0,
        "",
        null,
        1100,
        "",
      ],
    ]);
  });
});

describe("buildLedger, what it reports", () => {
  it("counts the lines it put on the page", () => {
    const { batchUpdateCalls } = stubLedgerSpreadsheet();

    runBuildLedger();

    expect(runStatusWritten(batchUpdateCalls)).toBe(
      `Built ledger for ${TENANT_NAME}: 3 charges, 3 payments, 2 reductions.`,
    );
  });

  it("drops the s from a count of one", () => {
    const { batchUpdateCalls } = stubLedgerSpreadsheet({
      charges: [
        {
          id: RENT_CHARGE,
          occupancyId: TENANT,
          date: DAY_ONE,
          description: "Rent (base)",
          amount: 50,
        },
      ],
      allocations: [
        {
          paymentId: "r:opy:rent",
          occupancyId: TENANT,
          filledOut: "Yes",
          formOfPayment: "Payment",
          payerCategory: "Household",
          payerName: TENANT_NAME,
          paymentDate: DAY_ONE,
          amount: 50,
          chargeDescription: "Rent (base)",
        },
      ],
    });

    runBuildLedger();

    expect(runStatusWritten(batchUpdateCalls)).toBe(
      `Built ledger for ${TENANT_NAME}: 1 charge, 1 payment, 0 reductions.`,
    );
  });

  it("names the start date in the run status and ignores the prior balance in the counts", () => {
    const { batchUpdateCalls } = stubLedgerSpreadsheet({
      startDates: { [TENANT]: DAY_TWO },
    });

    runBuildLedger();

    expect(runStatusWritten(batchUpdateCalls)).toBe(
      `Built ledger for ${TENANT_NAME}, from 25 Mar 2023: 1 charge, 2 payments, 2 reductions.`,
    );
  });

  it("reports a prior-balance-only window as a built page of zeroes", () => {
    const { batchUpdateCalls } = stubLedgerSpreadsheet({
      startDates: { [TENANT]: DAY_THREE + 1 },
    });

    runBuildLedger();

    expect(runStatusWritten(batchUpdateCalls)).toBe(
      `Built ledger for ${TENANT_NAME}, from 5 Apr 2023: 0 charges, 0 payments, 0 reductions.`,
    );
  });

  it("still carries from in the run status when the start date is before every line", () => {
    const { batchUpdateCalls } = stubLedgerSpreadsheet({
      startDates: { [TENANT]: DAY_ONE - 1 },
    });

    runBuildLedger();

    expect(runStatusWritten(batchUpdateCalls)).toBe(
      `Built ledger for ${TENANT_NAME}, from 14 Mar 2023: 3 charges, 3 payments, 2 reductions.`,
    );
  });

  it("says so plainly when an occupancy has nothing billed or paid", () => {
    const { batchUpdateCalls } = stubLedgerSpreadsheet({
      selectedOccupancyId: NEWCOMER,
      startDates: { [NEWCOMER]: DAY_TWO },
    });

    runBuildLedger();

    expect(runStatusWritten(batchUpdateCalls)).toBe(
      `No charges or payments for ${NEWCOMER_NAME}.`,
    );
  });

  it("names the blank cell it hit and leaves the previous ledger alone", () => {
    const { batchUpdateCalls } = stubLedgerSpreadsheet({
      charges: [{ id: RENT_CHARGE, occupancyId: TENANT, amount: 50 }],
    });

    runBuildLedger();

    expect(runStatusWritten(batchUpdateCalls)).toMatch(
      /"date".*"occCharge".*4/,
    );
    expect(ledgerRowsWritten(batchUpdateCalls)).toEqual([]);
    expect(ledgerRowShapeRequests(batchUpdateCalls)).toEqual([]);
  });
});
