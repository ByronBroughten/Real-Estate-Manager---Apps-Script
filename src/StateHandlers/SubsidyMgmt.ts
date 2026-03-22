import { dateU } from "../DateU";
import { OperatorBase } from "./HandlerBases/OperatorBase";
import type { Sheet } from "./Sheet";

interface AddSubsidyContractProps {
  subsidyAgreementId: string;
  unitId: string;
  endPriorActiveContracts?: "yes" | "no";
  rentChargeBaseMonthly: number;
  startDate: Date;
  endDate?: Date;
}

export class SubsidyMgmt extends OperatorBase {
  private agreementSheetProp: Sheet<"subsidyAgreement"> | null = null;
  private contractSheetProp: Sheet<"subsidyContract"> | null = null;
  private get agreementSheet() {
    if (!this.agreementSheetProp) {
      this.agreementSheetProp = this.ss.sheet("subsidyAgreement");
    }
    return this.agreementSheetProp;
  }
  private get contractSheet() {
    if (!this.contractSheetProp) {
      this.contractSheetProp = this.ss.sheet("subsidyContract");
    }
    return this.contractSheetProp;
  }
  doPeriodicSubsidyUpdates() {
    const subsidyAgreement = this.agreementSheet;
    subsidyAgreement.orderedRows.forEach((sa) => {
      const dateNext = sa.value("rentPortionDateNext");
      if (dateU.isDateAndTodayOrPassed(dateNext)) {
        this.addSubsidyContract({
          subsidyAgreementId: sa.id,
          startDate: dateNext,
          rentChargeBaseMonthly: sa.valueNumber("rentPortionMonthlyNext"),
          unitId: sa.value("unitId"),
          endPriorActiveContracts: "yes",
        });
      }
    });
  }
  addSubsidyContract({
    subsidyAgreementId,
    startDate,
    endPriorActiveContracts = "yes",
    ...rest
  }: AddSubsidyContractProps) {
    if (endPriorActiveContracts === "yes") {
      this.endActiveContracts(
        subsidyAgreementId,
        dateU.getDayBefore(startDate),
      );
    }
    this.contractSheet.addRowWithValues({
      subsidyAgreementId,
      startDate,
      ...rest,
    });
  }
  private endActiveContracts(subsidyAgreementId: string, endDate: Date): void {
    const activeContracts = this.contractSheet.rowsFiltered({
      subsidyAgreementId,
      endDate: "",
    });
    activeContracts.forEach((contract) => {
      contract.setValue("endDate", endDate);
    });
  }
}
