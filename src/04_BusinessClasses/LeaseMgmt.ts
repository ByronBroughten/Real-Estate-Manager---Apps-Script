// import type { TableValues } from "../01_generatedTraits/03_columnTraits";
// import { OperatorBase } from "../03_SpreadsheetNamed/ClassBases/OperatorBase";
// import type { SheetNamed } from "../03_SpreadsheetNamed/SheetNamed";
// import { Arr } from "../utils/Arr";
// import { Dat } from "../utils/Dat";

// interface AddLeaseProps {
//   householdId: string;
//   unitId: string;
//   endPriorActiveLeases?: "yes" | "no";
//   fillBlankValuesWithPriorLease?: "yes" | "no";
//   startDate: Date;
//   endDate?: Date;
//   rentChargeBaseMonthly?: number;
//   rentChargeUtilitiesMonthly?: number;
//   caretakerRentReduction?: number;
//   petFeeRecurring?: number;
// }

// const leaseAmountValueNames = [
//   "rentChargeBaseMonthly",
//   "rentChargeUtilitiesMonthly",
//   "caretakerRentReduction",
//   "petFeeRecurring",
// ] as const;
// type LeaseAmountValueNames = (typeof leaseAmountValueNames)[number];

// type LeaseAmountValues = Pick<
//   TableValues<"occupancyTerms">,
//   LeaseAmountValueNames
// >;

// export class LeaseMgmt extends OperatorBase {
//   private leaseSheetProp: SheetNamed<"occupancyTerms"> | null = null;
//   get leaseSheet() {
//     if (!this.leaseSheetProp) {
//       this.leaseSheetProp = this.ss.sheet("occupancyTerms");
//     }
//     return this.leaseSheetProp;
//   }
//   get leaseSchema() {
//     return this.schema.sheet("occupancyTerms");
//   }
//   get defaultLeaseValues(): LeaseAmountValues {
//     return {
//       rentChargeBaseMonthly: 0,
//       rentChargeUtilitiesMonthly: 0,
//       caretakerRentReduction: 0,
//       petFeeRecurring: 0,
//     };
//   }
//   doPeriodicLeaseUpdates() {
//     const household = this.sheet("household");
//     household.dataRows.forEach((hh) => {
//       const dateNext = hh.value("rentChangeDateNext");
//       if (Dat.isDateAndTodayOrPassed(dateNext)) {
//         const householdId = hh.id;
//         const rentChargeNext = hh.valueNumber("rentChargeMonthlyNext");
//         const utilityChargeNext = hh.valueNumber("utilityChargeMonthlyNext");
//         this.addLease({
//           householdId,
//           occupancyId: hh.value("occupancyId"),
//           startDate: dateNext,
//           fillBlankValuesWithPriorLease: "yes",
//           endPriorActiveLeases: "yes",
//           rentChargeBaseMonthly: rentChargeNext,
//           rentChargeUtilitiesMonthly: utilityChargeNext,
//         });
//         hh.updateValues({
//           rentChargeNextOverride: "",
//           utilityChargeNextOverride: "",
//         });
//       }
//     });
//   }
//   addLease({
//     householdId,
//     startDate,
//     endPriorActiveLeases = "yes",
//     fillBlankValuesWithPriorLease = "yes",
//     ...rest
//   }: AddLeaseProps) {
//     let defaults: LeaseAmountValues = this.defaultLeaseValues;
//     if (fillBlankValuesWithPriorLease === "yes") {
//       defaults = {
//         ...defaults,
//         ...this.priorLeaseValues(householdId),
//       };
//     }
//     if (endPriorActiveLeases === "yes") {
//       this.endActiveLeases(householdId, Dat.getDayBefore(startDate));
//     }
//     this.leaseSheet.appendRowWithVals({
//       householdId,
//       startDate,
//       ...defaults,
//       ...rest,
//     });
//   }
//   private priorLeaseValues(householdId: string): LeaseAmountValues | {} {
//     const priorUnendedLeases = this.leaseSheet.rowsFiltered({
//       householdId,
//       endDate: "",
//     });
//     if (priorUnendedLeases.length > 0) {
//       const descending = priorUnendedLeases.sort((a, b) =>
//         Arr.compareForSort(b.value("startDate"), a.value("startDate")),
//       );
//       return descending[0].values(leaseAmountValueNames);
//     }

//     const priorEndedLeases = this.leaseSheet.rowsFiltered({ householdId });
//     if (priorEndedLeases.length > 0) {
//       const descending = priorEndedLeases.sort((a, b) =>
//         Arr.compareForSort(b.value("endDate"), a.value("endDate")),
//       );
//       return descending[0].values(leaseAmountValueNames);
//     }
//     return {};
//   }
//   private endActiveLeases(householdId: string, endDate: Date): void {
//     const householdLeases = this.leaseSheet.rowsFiltered({
//       householdId,
//       endDate: "",
//     });
//     householdLeases.forEach((lease) => {
//       lease.updateValue("endDate", endDate);
//     });
//   }
// }
