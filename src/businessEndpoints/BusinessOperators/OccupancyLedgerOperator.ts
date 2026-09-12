import { SheetNamedBase } from "../../04_SpreadsheetNamed/ClassBases/SheetNamedBase";
import type { SpreadsheetNamedProps } from "../../04_SpreadsheetNamed/ClassBases/SpreadsheetNamedBase";
import type { RowNamed } from "../../04_SpreadsheetNamed/RowNamed";
import type { SheetNamed } from "../../04_SpreadsheetNamed/SheetNamed";
import { SpreadsheetNamed } from "../../04_SpreadsheetNamed/SpreadsheetNamed";
import { Dat, type DateSerial } from "../../utils/Dat";

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

interface PaymentFromAllocations {
  date: DateSerial;
  issuer: string;
  description: string;
  amount: number;
  depositAmount: number;
}

export class OccupancyLedgerOperator extends SheetNamedBase<"occupancyLedger"> {
  constructor(props: SpreadsheetNamedProps) {
    super({
      sheetName: "occupancyLedger",
      ...props,
    });
  }
  static init(ss: SpreadsheetNamed): OccupancyLedgerOperator {
    return new OccupancyLedgerOperator(ss.spreadsheetNamedProps);
  }
  get ss(): SpreadsheetNamed {
    return new SpreadsheetNamed(this.spreadsheetNamedProps);
  }
  get sheet(): SheetNamed<"occupancyLedger"> {
    return this.ss.sheet(this.sheetName);
  }
  build(occupancyRowIndex: number): string {
    this._gatherFetchInputs(occupancyRowIndex);
    const occupancyRow = this.ss.sheet("occupancy").row(occupancyRowIndex);
    const occupancyId = occupancyRow.value("id");
    this._updateLetterhead(occupancyId);
    const lines = [
      ...this._chargeLines(occupancyId),
      ...this._reductionLines(occupancyId),
      ...this._paymentLines(occupancyId),
    ].sort(compareLines);
    this._rebuildPage(lines);
    return this._runStatusMessage(occupancyRow.value("name"), lines);
  }
  private _gatherFetchInputs(occupancyRowIndex: number): void {
    const { ss } = this;
    ss.sheet("occupancy").prepFetchColumnsSpecific(
      [occupancyRowIndex],
      "id",
      "name",
    );
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
    this.sheet.prepFetchColumnsFull(
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
  private _updateLetterhead(occupancyId: string): void {
    this.ss.sheet("variable").topRow.updateValues({
      occupancyLedgerOccId: occupancyId,
      occupancyLedgerDateRan: Dat.today(),
    });
  }
  private _chargeLines(occupancyId: string): LedgerLine[] {
    return this.ss
      .sheet("occCharge")
      .rowsFiltered({ occupancyId })
      .map(chargeLine);
  }
  private _reductionLines(occupancyId: string): LedgerLine[] {
    const sheet = this.ss.sheet("occChargeReduce");
    const chargesById = this._chargesById();
    return sheet.rowIndexesActiveWithData.flatMap((rowIndex) => {
      const reduction = sheet.row(rowIndex);
      const charge = chargesById.get(reduction.value("chargeId"));
      // A reduction of another occupancy's charge belongs on another ledger.
      if (charge?.valueOrEmpty("occupancyId") !== occupancyId) return [];
      return [this._reductionLine(reduction, charge)];
    });
  }
  // Blank-tolerant, so a half-filled charge on another occupancy can't fail this build.
  private _chargesById(): Map<string, RowNamed<"occCharge">> {
    const sheet = this.ss.sheet("occCharge");
    return sheet.rowIndexesActiveWithData.reduce((byId, rowIndex) => {
      const charge = sheet.row(rowIndex);
      byId.set(charge.valueOrEmpty("id"), charge);
      return byId;
    }, new Map<string, RowNamed<"occCharge">>());
  }
  private _reductionLine(
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
      throw new Error(
        `Charge reduction description "${String(description)}" has no ledger line.`,
      );
    }
  }
  private _paymentLines(occupancyId: string): LedgerLine[] {
    const allocations = this.ss
      .sheet("occPayAllocation")
      .rowsFiltered({ occupancyId, filledOut: "Yes" });
    return this._payments(allocations).map((payment) => ({
      kind: "payment",
      date: payment.date,
      issuer: payment.issuer,
      description: paymentLineDescription(payment),
      charge: "",
      payment: payment.amount,
      notes: "",
      depositDelta: payment.depositAmount,
    }));
  }
  // One line per payment, so a tenant can check the page against one bank transaction.
  private _payments(
    allocations: RowNamed<"occPayAllocation">[],
  ): PaymentFromAllocations[] {
    const byPaymentId = allocations.reduce((payments, allocation) => {
      const paymentId = allocation.value("paymentId");
      const amount = allocation.value("amount");
      const payment = payments.get(paymentId) ?? {
        date: allocation.value("paymentDate"),
        issuer: paymentIssuer(allocation),
        description: allocation.value("formOfPayment"),
        amount: 0,
        depositAmount: 0,
      };
      payment.amount += amount;
      if (allocation.value("chargeDescription") === securityDepositCharge) {
        payment.depositAmount += amount;
      }
      payments.set(paymentId, payment);
      return payments;
    }, new Map<string, PaymentFromAllocations>());
    return [...byPaymentId.values()];
  }
  private _rebuildPage(lines: LedgerLine[]): void {
    const { sheet } = this;
    sheet.DELETE_ALL_DATA_ROWS();
    let depositHeld = 0;
    lines.forEach((line) => {
      depositHeld += line.depositDelta;
      sheet.appendRowWithAllVals({
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
  private _runStatusMessage(
    occupancyName: string,
    lines: LedgerLine[],
  ): string {
    if (lines.length === 0) {
      return `No charges or payments for ${occupancyName}.`;
    }
    return `Built ledger for ${occupancyName}: ${countOfKind(lines, "charge")} charges, ${countOfKind(lines, "payment")} payments, ${countOfKind(lines, "reduction")} reductions.`;
  }
}

function chargeLine(charge: RowNamed<"occCharge">): LedgerLine {
  return {
    kind: "charge",
    date: charge.value("date"),
    issuer: issuers.propertyManagement,
    description: charge.value("description"),
    charge: charge.value("amount"),
    payment: "",
    notes: charge.value("notes"),
    depositDelta: 0,
  };
}

// A payment that only funds the held deposit says so, rather than reading as a generic Payment.
function paymentLineDescription(payment: PaymentFromAllocations): string {
  if (payment.depositAmount === payment.amount && payment.amount > 0) {
    return securityDepositCharge;
  }
  return payment.description;
}

// The tenant's own money says so plainly rather than repeating their name down the page.
function paymentIssuer(allocation: RowNamed<"occPayAllocation">): string {
  if (allocation.value("payerCategory") === "Household") {
    return issuers.household;
  }
  return allocation.value("payerName");
}

function compareLines(a: LedgerLine, b: LedgerLine): number {
  if (a.date !== b.date) {
    return a.date - b.date;
  }
  return kindRanks[a.kind] - kindRanks[b.kind];
}

// Blank wherever the balance didn't move, so the column draws the eye to what moved it.
function depositBalanceCell(
  line: LedgerLine,
  depositHeld: number,
): number | "" {
  if (line.depositDelta === 0) {
    return "";
  }
  return depositHeld;
}

function countOfKind(lines: LedgerLine[], kind: LedgerLine["kind"]): number {
  return lines.filter((line) => line.kind === kind).length;
}
