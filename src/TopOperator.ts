import type { GroupSectionName } from "./appSchema/1. attributes/sectionAttributes";
import type { SectionValues } from "./appSchema/1. attributes/varbAttributes";
import { ChargeMgmt } from "./StateHandlers/ChargeMgmt";
import { ExpenseMgmt } from "./StateHandlers/ExpenseMgmt";
import { OperatorBase } from "./StateHandlers/HandlerBases/OperatorBase";
import { LeaseMgmt } from "./StateHandlers/LeaseMgmt";
import { LedgerMgmt } from "./StateHandlers/LedgerMgmt";
import { PaymentMgmt } from "./StateHandlers/PaymentMgmt";
import { Spreadsheet } from "./StateHandlers/Spreadsheet";
import { SubsidyMgmt } from "./StateHandlers/SubsidyMgmt";

type ApiFunctions = {
  readonly [SN in GroupSectionName<"api">]: (values: SectionValues<SN>) => void;
};

export class ApiOperator extends OperatorBase {
  readonly ledgerMgmt = new LedgerMgmt(this.ss);
  readonly chargeMgmt = new ChargeMgmt(this.ss);
  readonly expenseMgmt = new ExpenseMgmt(this.ss);
  readonly paymentMgmt = new PaymentMgmt(this.ss);
  readonly leaseMgmt = new LeaseMgmt(this.ss);
  readonly subsidyMgmt = new SubsidyMgmt(this.ss);
  readonly apiFunctions: ApiFunctions = {
    buildHhLedger: (values) => this.ledgerMgmt.buildHhLedger(values),
    addExpenses: (values) => this.expenseMgmt.addExpenses(values),
    addHhChargeOnetime: (values) => this.chargeMgmt.addHhChargeOnetime(values),
    addHhPaymentOnetime: (values) =>
      this.paymentMgmt.addHhPaymentOnetime(values),
  };
  doPeriodicContractUpdates() {
    this.leaseMgmt.doPeriodicLeaseUpdates();
    this.subsidyMgmt.doPeriodicSubsidyUpdates();
    this.batchUpdateRanges();
  }
  monthlyRentUpdate() {
    this.doPeriodicContractUpdates();

    // const cfp = this.buildOutChargesForMonth();
    // this.buildOutPaymentsFromCharges(cfp);
    this.ss.batchUpdateRanges();
  }

  test() {
    return "test";
  }
  static init(): ApiOperator {
    const ss = Spreadsheet.init();
    return new ApiOperator(ss);
  }

  // buildOutChargesForMonth(date: Date = new Date()) {
  //   //depreciated
  //   const cfp: ChargeIdsForPayments = {
  //     paymentGroup: {},
  //     subsidyAgreement: {},
  //     household: {},
  //   };

  //   const { firstOfMonth, lastOfMonth } =
  //     utils.date.firstAndLastDayOfMonth(date);

  //   const household = this.ss.sheet("household");
  //   const subsidyContract = this.ss.sheet("subsidyContract");
  //   const hhLeaseOngoing = this.ss.sheet("hhLease");
  //   const charge = this.ss.sheet("hhCharge");

  //   function getActives<SN extends "hhLease" | "subsidyContract">(
  //     householdId: string,
  //     sheet: Sheet<SN>,
  //   ): Row<SN>[] {
  //     return sheet.orderedRows.filter((row) => {
  //       const startDate = row.valueDate("startDate");
  //       const endDate = row.dateValueOrGivenDate("endDate", lastOfMonth);
  //       // The start date needs to be on or before the last day of the month
  //       // The end date needs to be on or after the first day of the month
  //       return (
  //         row.value("householdId") === householdId &&
  //         utils.date.isDateSameOrBefore(startDate, lastOfMonth) &&
  //         utils.date.isDateSameOrAfter(endDate, firstOfMonth)
  //       );
  //     });
  //   }

  //   household.orderedRows.forEach((hh) => {
  //     const householdId = hh.id;

  //     const hhLeasesActiveThisMonth = getActives(householdId, hhLeaseOngoing);
  //     const scChargesActiveThisMonth = getActives(householdId, subsidyContract);

  //     const varbNames = Obj.keys(chargeVarbToDescriptor);
  //     for (const varbName of varbNames) {
  //       let householdPortion = 0;

  //       // TODO: Account for if a tenant switches units mid-month
  //       // TODO: Divvy subsidy charges by subsidy contract if there are multiple.
  //       // TODO: Make separate ongoing charges for pet fees
  //       const firstUnitId = hhLeasesActiveThisMonth[0].value("unitId");

  //       const chargeProps = {
  //         date: firstOfMonth,
  //         unitId: firstUnitId,
  //         householdId,
  //       } as const;

  //       for (const lease of hhLeasesActiveThisMonth) {
  //         householdPortion += proratedPortion(lease, varbName, {
  //           firstOfMonth,
  //           lastOfMonth,
  //         });
  //       }

  //       if (varbName === "caretakerRentReduction") {
  //         if (householdPortion > 0) {
  //           this.handleCaretakerRentReduction({
  //             amount: householdPortion,
  //             date: firstOfMonth,
  //             householdId,
  //             unitId: firstUnitId,
  //           });
  //         }
  //         continue;
  //       }
  //       if (varbName === "rentChargeBaseMonthly") {
  //         let subsidyPortion = 0;
  //         for (const scContract of scChargesActiveThisMonth) {
  //           subsidyPortion += proratedPortion(scContract, "amount", {
  //             firstOfMonth,
  //             lastOfMonth,
  //           });
  //         }
  //         if (subsidyPortion) {
  //           const topScCharge = scChargesActiveThisMonth[0];
  //           householdPortion -= subsidyPortion;
  //           const chargeId = charge.addRowWithValues({
  //             portion: "Subsidy program",
  //             description: "Rent charge (base)",
  //             subsidyAgreementId: topScCharge.value("subsidyAgreementId"),
  //             amount: subsidyPortion,
  //             ...chargeProps,
  //           });
  //           const paymentGroupId =
  //             scChargesActiveThisMonth[0].value("paymentGroupId");
  //           if (paymentGroupId) {
  //             Obj.pushByKey(cfp.paymentGroup, paymentGroupId, chargeId);
  //           } else {
  //             for (const scContract of scChargesActiveThisMonth) {
  //               Obj.pushByKey(
  //                 cfp.subsidyAgreement,
  //                 scContract.id,
  //                 chargeId,
  //               );
  //             }
  //           }
  //         }
  //       }

  //       if (householdPortion !== 0) {
  //         const chargId = charge.addRowWithValues({
  //           amount: householdPortion,
  //           portion: "Household",
  //           description: chargeVarbToDescriptor[varbName],
  //           ...chargeProps,
  //         });
  //         Obj.pushByKey(cfp.household, householdId, chargId);
  //       }
  //     }
  //   });
  //   return cfp;
  // }

  // private buildOutAllCharges(): void {
  //   const ss = this.ss;
  //   const hhCharge = ss.sheet("hhCharge");
  //   hhCharge.DELETE_ALL_BODY_ROWS();

  //   this.buildFromChargesOngoing(({ date, proratedAmount, chargeOngoing }) => {
  //     hhCharge.addRowWithValues({
  //       date,
  //       amount: proratedAmount,
  //       chargeOngoingId: chargeOngoing.id,
  //       ...chargeOngoing.values([
  //         "portion",
  //         "description",
  //         "householdId",
  //         "petId",
  //         "subsidyAgreementId",
  //         "unitId",
  //       ]),
  //     });
  //   });
  //   hhCharge.sortWithoutAddingChanges("subsidyAgreementId");
  //   hhCharge.sortWithoutAddingChanges("date");
  //   hhCharge.sort("hhMembersFullName");
  //   ss.batchUpdateRanges();
  // }
}

// type Dates = {
//   firstOfMonth: Date;
//   lastOfMonth: Date;
// };

// function proratedPortion<
//   SN extends "hhLease" | "subsidyContract",
//   VN extends VarbName<SN>,
// >(row: Row<SN>, varbName: VN, dates: Dates): number {
//   const startDate = row.dateValueAfterOrGivenDate(
//     "startDate",
//     dates.firstOfMonth,
//   );
//   const endDate = row.dateValueBeforeOrGivenDate("endDate", dates.lastOfMonth);
//   return utils.date.proratedMonthlyAmount({
//     amount: row.valueNumber(varbName),
//     startDate,
//     endDate,
//     month: dates.firstOfMonth.getMonth() + 1,
//     year: dates.firstOfMonth.getFullYear(),
//   });
// }
