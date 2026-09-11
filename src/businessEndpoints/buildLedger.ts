import type { RowNamed } from "../04_SpreadsheetNamed/RowNamed";
import type { SpreadsheetNamed } from "../04_SpreadsheetNamed/SpreadsheetNamed";
import type { Endpoint } from "../06_API/Endpoints";
import { Arr } from "../utils/Arr";
import { Dat, type DateSerial } from "../utils/Dat";

const issuers = {
  propertyManagement: "Property management",
  securityDeposit: "Security deposit",
  household: "Household",
} as const;

// The charge description a payment must settle for the deposit balance to rise.
const securityDepositCharge = "Security deposit";

// Charge before reduction before payment, so a same-day settlement never shows a balance the tenant never had.
const kindRanks = { charge: 0, reduction: 1, payment: 2 } as const;

interface LedgerLine {
  kind: keyof typeof kindRanks;
  date: DateSerial;
  issuer: string;
  description: string;
  charge: number | "";
  payment: number | "";
  notes: string;
  depositDelta: number;
}

interface PaymentGroup {
  date: DateSerial;
  issuer: string;
  description: string;
  amount: number;
  depositAmount: number;
}

export const buildLedger: Endpoint<"occupancy"> = {
  timeLastRan: "buildLedgerTimeLastRan",
  runStatus: "buildLedgerRunStatus",
  selector: { column: "buildLedgerSelect", requireOneRow: true },
  action: (ss, { selectedRowIndexes }) => {
    const rowIndex = Arr.firstOrThrow(selectedRowIndexes);
    fetchLedgerInputs(ss, rowIndex);
    const occupancy = ss.sheet("occupancy").row(rowIndex);
    const occupancyId = occupancy.value("id");
    updateLetterheadVariables(ss, occupancyId);
    const lines = ledgerLines(ss, occupancyId);
    rebuildLedger(ss, lines);
    return runStatusMessage(occupancy.value("name"), lines);
  },
};

function fetchLedgerInputs(ss: SpreadsheetNamed, rowIndex: number): void {
  ss.sheet("occupancy").prepFetchColumnsSpecific([rowIndex], "id", "name");
  ss.sheet("occCharge").prepFetchColumnsFull(
    "id",
    "occupancyId",
    "date",
    "description",
    "amount",
    "notes",
  );
  ss.sheet("occChargeReduce").prepFetchColumnsFull(
    "chargeId",
    "date",
    "description",
    "amount",
  );
  ss.sheet("occPayAllocation").prepFetchColumnsFull(
    "paymentId",
    "occupancyId",
    "filledOut",
    "formOfPayment",
    "payerCategory",
    "payerName",
    "paymentDate",
    "amount",
    "chargeDescription",
  );
  ss.sheet("variable").prepFetchColumnsFull(
    "occupancyLedgerOccId",
    "occupancyLedgerDateRan",
  );
  ss.sheet("occupancyLedger").prepFetchColumnsFull(
    "date",
    "issuer",
    "description",
    "charge",
    "payment",
    "securityDeposit",
    "notes",
  );
  ss.fetchAllPrepped();
}

// The two cells the ledger's letterhead formulas read.
function updateLetterheadVariables(
  ss: SpreadsheetNamed,
  occupancyId: string,
): void {
  ss.sheet("variable").topRow.updateValues({
    occupancyLedgerOccId: occupancyId,
    occupancyLedgerDateRan: Dat.today(),
  });
}

function ledgerLines(ss: SpreadsheetNamed, occupancyId: string): LedgerLine[] {
  const charges = ss.sheet("occCharge").rowsFiltered({ occupancyId });
  const lines = [
    ...charges.map(chargeLine),
    ...reductionLines(ss, chargesById(charges)),
    ...paymentLines(ss, occupancyId),
  ];
  return lines.sort(compareLines);
}

function chargeLine(charge: RowNamed<"occCharge">): LedgerLine {
  return {
    kind: "charge",
    date: charge.value("date"),
    issuer: issuers.propertyManagement,
    description: charge.value("description"),
    charge: charge.value("amount"),
    payment: "",
    // Most charges carry none; ticking the column's Empty value allowed box makes this value().
    notes: charge.valueOrEmpty("notes"),
    depositDelta: 0,
  };
}

function chargesById(
  charges: RowNamed<"occCharge">[],
): Map<string, RowNamed<"occCharge">> {
  return charges.reduce((byId, charge) => {
    byId.set(charge.value("id"), charge);
    return byId;
  }, new Map<string, RowNamed<"occCharge">>());
}

function reductionLines(
  ss: SpreadsheetNamed,
  charges: Map<string, RowNamed<"occCharge">>,
): LedgerLine[] {
  const sheet = ss.sheet("occChargeReduce");
  return sheet.rowIndexesActiveWithData.flatMap((rowIndex) => {
    const reduction = sheet.row(rowIndex);
    // A reduction of another occupancy's charge belongs on another ledger.
    const charge = charges.get(reduction.value("chargeId"));
    if (!charge) return [];
    return [reductionLine(reduction, charge)];
  });
}

function reductionLine(
  reduction: RowNamed<"occChargeReduce">,
  charge: RowNamed<"occCharge">,
): LedgerLine {
  const description = reduction.value("description");
  const date = reduction.value("date");
  const amount = reduction.value("amount");
  if (description === "Forgiveness") {
    return {
      kind: "reduction",
      date,
      issuer: issuers.propertyManagement,
      description,
      charge: -amount,
      payment: "",
      notes: "",
      depositDelta: 0,
    };
  } else if (description === "Security deposit") {
    return {
      kind: "reduction",
      date,
      issuer: issuers.securityDeposit,
      description: charge.value("description"),
      charge: "",
      payment: amount,
      notes: "",
      depositDelta: -amount,
    };
  } else {
    return unroutableReduction(description);
  }
}

function unroutableReduction(description: never): never {
  throw new Error(
    `Charge reduction description "${String(description)}" has no ledger line.`,
  );
}

function paymentLines(
  ss: SpreadsheetNamed,
  occupancyId: string,
): LedgerLine[] {
  const allocations = ss
    .sheet("occPayAllocation")
    .rowsFiltered({ occupancyId, filledOut: "Yes" });
  return paymentGroups(allocations).map((group) => ({
    kind: "payment",
    date: group.date,
    issuer: group.issuer,
    description: group.description,
    charge: "",
    payment: group.amount,
    notes: "",
    depositDelta: group.depositAmount,
  }));
}

// One line per payment, so a tenant can check the page against one bank transaction.
function paymentGroups(
  allocations: RowNamed<"occPayAllocation">[],
): PaymentGroup[] {
  const groups = allocations.reduce((byPayment, allocation) => {
    const formOfPayment = allocation.value("formOfPayment");
    const key = `${allocation.value("paymentId")}:${formOfPayment}`;
    const amount = allocation.value("amount");
    const group = byPayment.get(key) ?? {
      date: allocation.value("paymentDate"),
      issuer: paymentIssuer(allocation),
      description: paymentDescription(formOfPayment),
      amount: 0,
      depositAmount: 0,
    };
    group.amount += amount;
    if (allocation.value("chargeDescription") === securityDepositCharge) {
      group.depositAmount += amount;
    }
    byPayment.set(key, group);
    return byPayment;
  }, new Map<string, PaymentGroup>());
  return [...groups.values()];
}

// The tenant's own money says so plainly rather than repeating their name down the page.
function paymentIssuer(allocation: RowNamed<"occPayAllocation">): string {
  if (allocation.value("payerCategory") === "Household") {
    return issuers.household;
  }
  return allocation.value("payerName");
}

// Every other form reads "Payment" until the stored Currency value is renamed.
function paymentDescription(formOfPayment: string): string {
  if (formOfPayment === "Caretaking") {
    return "Caretaking";
  }
  return "Payment";
}

function compareLines(a: LedgerLine, b: LedgerLine): number {
  if (a.date !== b.date) {
    return a.date - b.date;
  }
  return kindRanks[a.kind] - kindRanks[b.kind];
}

function rebuildLedger(ss: SpreadsheetNamed, lines: LedgerLine[]): void {
  const ledger = ss.sheet("occupancyLedger");
  ledger.DELETE_ALL_DATA_ROWS();
  let depositHeld = 0;
  lines.forEach((line) => {
    depositHeld += line.depositDelta;
    ledger.appendRowWithAllVals({
      date: line.date,
      issuer: line.issuer,
      description: line.description,
      charge: line.charge,
      payment: line.payment,
      securityDeposit: depositBalanceCell(line, depositHeld),
      notes: line.notes,
    });
  });
}

// Blank wherever the balance didn't move, so the column draws the eye to what moved it.
function depositBalanceCell(line: LedgerLine, depositHeld: number): number | "" {
  if (line.depositDelta === 0) {
    return "";
  }
  return depositHeld;
}

function runStatusMessage(
  occupancyName: string,
  lines: LedgerLine[],
): string {
  if (lines.length === 0) {
    return `No charges or payments for ${occupancyName}.`;
  }
  return `Built ledger for ${occupancyName}: ${countOfKind(lines, "charge")} charges, ${countOfKind(lines, "payment")} payments, ${countOfKind(lines, "reduction")} reductions.`;
}

function countOfKind(lines: LedgerLine[], kind: LedgerLine["kind"]): number {
  return lines.filter((line) => line.kind === kind).length;
}
