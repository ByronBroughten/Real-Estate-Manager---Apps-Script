import type { SectionValues } from "../appSchema/1. attributes/varbAttributes";
import { Obj } from "../utils/Obj";
import { OperatorBase } from "./HandlerBases/OperatorBase";
import type { Row } from "./Row";

type PaymentIdToCharges = Record<string, Row<"hhCharge">[]>;

type ChargeIdsForPayments = {
  paymentGroup: {
    [paymentGroupId: string]: string[];
  };
  subsidyContract: {
    [subsidyContractId: string]: string[];
  };
  household: {
    [householdId: string]: string[];
  };
};
type PaymentGroupType = keyof ChargeIdsForPayments;

export class PaymentMgmt extends OperatorBase {
  addHhPaymentOnetime(values: SectionValues<"addHhPaymentOnetime">) {
    const hhPayment = this.ss.sheet("hhPayment");
    const hhAllocation = this.ss.sheet("hhPaymentAllocation");
    const payerValues = Obj.strictPick(values, [
      "date",
      "amount",
      "payerCategory",
      "detailsVerified",
      "paymentHhId",
      "subsidyProgramId",
      "otherPayerId",
    ]);

    switch (payerValues.payerCategory) {
      case "Household":
        if (!payerValues.paymentHhId) {
          throw new Error("Household ID is required");
        }
        break;
      case "Subsidy program":
        if (!payerValues.subsidyProgramId) {
          throw new Error("Subsidy program ID is required");
        }
        break;
      case "Other payer":
        if (!payerValues.otherPayerId) {
          throw new Error("Other payer ID is required");
        }
        break;
      default: {
        throw new Error("Payer category is required");
      }
    }

    const paymentId = hhPayment.addRowWithValues({
      ...payerValues,
      ...(payerValues.paymentHhId && { householdId: payerValues.paymentHhId }),
    });

    const allocateValues = Obj.strictPick(values, [
      "householdId",
      "portion",
      "description",
      "amount",
      "unitId",
      "subsidyContractId",
    ]);

    if (allocateValues.portion === "Subsidy program") {
      if (!allocateValues.subsidyContractId) {
        throw new Error("Subsidy contract ID is required");
      }
    }

    hhAllocation.addRowWithValues({
      ...allocateValues,
      paymentId,
    });
    this.ss.batchUpdateRanges();
  }
  buildOutPaymentsFromCharges(cfp: ChargeIdsForPayments) {
    for (const paymentGroupType of [
      "household",
      "subsidyContract",
      "paymentGroup",
    ] as const) {
      this.addPaymentsAndAllocate({
        paymentGroupType,
        idToChargeIds: cfp[paymentGroupType],
      });
    }
  }
  addPaymentsAndAllocate({
    paymentGroupType,
    idToChargeIds,
  }: {
    paymentGroupType: PaymentGroupType;
    idToChargeIds: { [id: string]: string[] };
  }) {
    const hhCharge = this.ss.sheet("hhCharge");
    const payment = this.ss.sheet("hhPayment");
    const paymentGroup = this.ss.sheet("paymentGroup");
    const subsidyContract = this.ss.sheet("subsidyContract");

    const paymentIdToCharges: PaymentIdToCharges = {};
    for (const [groupId, chargeIds] of Obj.entries(idToChargeIds)) {
      const charges = chargeIds.map((chargeId) => hhCharge.row(chargeId));
      function addPayment(values: Partial<SectionValues<"hhPayment">>) {
        const topCharge = charges[0];
        const paymentId = payment.addRowWithValues({
          detailsVerified: "No",
          amount: 0,
          date: topCharge.value("date"),
          ...values,
        });

        let amount = 0;
        for (const charge of charges) {
          amount += charge.valueNumber("amount");
          Obj.pushByKey(paymentIdToCharges, paymentId, charge);
        }
        payment.row(paymentId).setValue("amount", amount);
      }

      const handlers: Record<PaymentGroupType, () => void> = {
        household: () => {
          addPayment({
            payerCategory: "Household",
            householdId: groupId,
          });
        },
        subsidyContract: () => {
          addPayment({
            payerCategory: "Subsidy program",
            subsidyProgramId: subsidyContract
              .row(groupId)
              .value("subsidyProgramId"),
          });
        },
        paymentGroup: () => {
          const pg = paymentGroup.row(groupId);
          addPayment(
            pg.values([
              "householdId",
              "payerCategory",
              "subsidyProgramId",
              "otherPayerId",
            ]),
          );
        },
      };

      handlers[paymentGroupType]();
    }
    this.addAllocations(paymentIdToCharges);
  }
  addAllocations(paymentIdToCharges: PaymentIdToCharges) {
    const allocation = this.ss.sheet("hhPaymentAllocation");
    for (const [paymentId, chargeRows] of Object.entries(paymentIdToCharges)) {
      chargeRows.forEach((charge) => {
        allocation.addRowWithValues({
          paymentId,
          description: "Normal payment",
          ...charge.values([
            "amount",
            "portion",
            "householdId",
            "unitId",
            "subsidyContractId",
          ]),
        });
      });
    }
  }
}
