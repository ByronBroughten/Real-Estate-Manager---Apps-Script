// import type { SheetDataValues } from "../02_generatedTraits/03_columnTraits";
// import { OperatorBase } from "../04_SpreadsheetNamed/ClassBases/OperatorBase";
// import type { DataRowNamed } from "../04_SpreadsheetNamed/DataRowNamed";
// import { Obj } from "../utils/Obj";

// type PaymentIdToCharges = Record<string, DataRowNamed<"occCharge">[]>;

// type ChargeIdsForPayments = {
//   paymentGroup: {
//     [paymentGroupId: string]: string[];
//   };
//   subsidyAgreement: {
//     [subsidyAgreementId: string]: string[];
//   };
//   household: {
//     [householdId: string]: string[];
//   };
// };
// type PaymentGroupType = keyof ChargeIdsForPayments;

// export class PaymentMgmt extends OperatorBase {
//   addOccPaymentOnetime() {
//     const occPayment = this.ss.sheet("occPayment");
//     const occPayAllocation = this.ss.sheet("occPayAllocation");
//     const payerValues = Obj.strictPick(values, [
//       "date",
//       "amount",
//       "payerCategory",
//       "detailsVerified",
//       "paymentHhId",
//       "subsidyProgramId",
//       "nonResidentPayerId",
//     ]);

//     switch (payerValues.payerCategory) {
//       case "Household":
//         if (!payerValues.paymentHhId) {
//           throw new Error("Household ID is required");
//         }
//         break;
//       case "Subsidy program":
//         if (!payerValues.subsidyProgramId) {
//           throw new Error("Subsidy program ID is required");
//         }
//         break;
//       case "Other payer":
//         if (!payerValues.nonResidentPayerId) {
//           throw new Error("Other payer ID is required");
//         }
//         break;
//       default: {
//         throw new Error("Payer category is required");
//       }
//     }

//     const paymentId = occPayment.appendRowWithVals({
//       ...payerValues,
//       ...(payerValues.paymentHhId && { householdId: payerValues.paymentHhId }),
//     });

//     const allocateValues = Obj.strictPick(values, [
//       "householdId",
//       "portion",
//       "description",
//       "amount",
//       "unitId",
//       "subsidyAgreementId",
//     ]);

//     if (allocateValues.portion === "Subsidy program") {
//       if (!allocateValues.subsidyAgreementId) {
//         throw new Error("Subsidy agreement ID is required");
//       }
//     }

//     occPayAllocation.appendRowWithVals({
//       ...allocateValues,
//       paymentId,
//     });
//     this.ss.gatherRequestsAndBatchUpdate();
//   }
//   buildOutPaymentsFromCharges(cfp: ChargeIdsForPayments) {
//     for (const paymentGroupType of [
//       "household",
//       "subsidyAgreement",
//       "paymentGroup",
//     ] as const) {
//       this.addPaymentsAndAllocate({
//         paymentGroupType,
//         idToChargeIds: cfp[paymentGroupType],
//       });
//     }
//   }
//   addPaymentsAndAllocate({
//     paymentGroupType,
//     idToChargeIds,
//   }: {
//     paymentGroupType: PaymentGroupType;
//     idToChargeIds: { [id: string]: string[] };
//   }) {
//     const occCharge = this.ss.sheet("occCharge");
//     const payment = this.ss.sheet("occPayment");
//     const paymentGroup = this.ss.sheet("paymentGroup");
//     const subsidyAgreement = this.ss.sheet("subsidyAgreement");

//     const paymentIdToCharges: PaymentIdToCharges = {};
//     for (const [groupId, chargeIds] of Obj.entries(idToChargeIds)) {
//       const charges = chargeIds.map((chargeId) => occCharge.row(chargeId));
//       function addPayment(values: Partial<SheetDataValues<"occPayment">>) {
//         const topCharge = charges[0];
//         const paymentId = payment.appendRowWithVals({
//           detailsVerified: "No",
//           amount: 0,
//           date: topCharge.value("date"),
//           ...values,
//         });

//         let amount = 0;
//         for (const charge of charges) {
//           amount += charge.valueNumber("amount");
//           Obj.pushByKey(paymentIdToCharges, paymentId, charge);
//         }
//         payment.row(paymentId).updateValue("amount", amount);
//       }

//       const handlers: Record<PaymentGroupType, () => void> = {
//         household: () => {
//           addPayment({
//             payerCategory: "Household",
//             householdId: groupId,
//           });
//         },
//         subsidyAgreement: () => {
//           addPayment({
//             payerCategory: "Subsidy program",
//             subsidyProgramId: subsidyAgreement
//               .row(groupId)
//               .value("subsidyProgramId"),
//           });
//         },
//         paymentGroup: () => {
//           const pg = paymentGroup.row(groupId);
//           addPayment(
//             pg.values(
//               "householdId",
//               "payerCategory",
//               "subsidyProgramId",
//               "nonResidentPayerId",
//             ),
//           );
//         },
//       };

//       handlers[paymentGroupType]();
//     }
//     this.addAllocations(paymentIdToCharges);
//   }
//   addAllocations(paymentIdToCharges: PaymentIdToCharges) {
//     const allocation = this.ss.sheet("occPayAllocation");
//     for (const [paymentId, chargeRows] of Object.entries(paymentIdToCharges)) {
//       chargeRows.forEach((charge) => {
//         allocation.appendRowWithVals({
//           paymentId,
//           description: "Normal payment",
//           ...charge.values(
//             "amount",
//             "portion",
//             "householdId",
//             "unitId",
//             "subsidyAgreementId",
//           ),
//         });
//       });
//     }
//   }
// }
