import { dateU } from "../DateU";
import { OperatorBase } from "./HandlerBases/OperatorBase";
import type { Row } from "./Row";
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
        const contractLease = this.getActiveLeaseForContract(sa, dateNext);
        this.addSubsidyContract({
          subsidyAgreementId: sa.id,
          startDate: dateNext,
          rentChargeBaseMonthly: sa.valueNumber("rentPortionMonthlyNext"),
          unitId: contractLease.value("unitId"),
          endPriorActiveContracts: "yes",
        });
        sa.setValue("rentPortionDateNext", "");
      }
    });
  }
  private getActiveLeaseForContract(
    sa: Row<"subsidyAgreement">,
    dateNext: Date,
  ): Row<"hhLease"> {
    const leaseSheet = this.sheet("hhLease");
    const hhLeases = leaseSheet.rowsFiltered({
      householdId: sa.value("householdId"),
    });
    const activeLeases = hhLeases.filter((lease) => {
      return lease.valueDate("startDate") <= dateNext;
    });
    const ascendingLeases = activeLeases.sort(
      (a, b) =>
        a.valueDate("startDate").getTime() - b.valueDate("startDate").getTime(),
    );

    if (ascendingLeases.length === 0) {
      throw new Error(
        `No active leases found for household ${sa.value("householdId")} when trying to update subsidy agreement ${sa.id}`,
      );
    }
    return ascendingLeases[0];
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
