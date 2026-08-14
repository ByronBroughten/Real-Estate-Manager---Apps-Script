import { OperatorBase } from "../03_SpreadsheetNamed/ClassBases/OperatorBase";
import type { DataRowNamed } from "../03_SpreadsheetNamed/DataRowNamed";
import type { SheetNamed } from "../03_SpreadsheetNamed/SheetNamed";
import { Dat } from "../utils/Dat";

interface AddSubsidyContractProps {
  subsidyAgreementId: string;
  unitId: string;
  endPriorActiveContracts?: "yes" | "no";
  rentChargeBaseMonthly: number;
  startDate: Date;
  endDate?: Date;
}

export class SubsidyMgmt extends OperatorBase {
  private agreementSheetProp: SheetNamed<"subsidyAgreement"> | null = null;
  private contractSheetProp: SheetNamed<"subsidyContract"> | null = null;
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
    subsidyAgreement.dataRows.forEach((sa) => {
      const dateNext = sa.value("rentPortionDateNext");
      if (Dat.isDateAndTodayOrPassed(dateNext)) {
        const contractLease = this.getActiveLeaseForContract(sa, dateNext);
        this.addSubsidyContract({
          subsidyAgreementId: sa.id,
          startDate: dateNext,
          rentChargeBaseMonthly: sa.valueNumber("rentPortionMonthlyNext"),
          unitId: contractLease.value("unitId"),
          endPriorActiveContracts: "yes",
        });
        sa.updateValue("rentPortionDateNext", "");
      }
    });
  }
  private getActiveLeaseForContract(
    sa: DataRowNamed<"subsidyAgreement">,
    dateNext: Date,
  ): DataRowNamed<"occupancyTerms"> {
    const leaseSheet = this.sheet("occupancyTerms");
    const occupancyTermss = leaseSheet.rowsFiltered({
      householdId: sa.value("householdId"),
    });
    const activeLeases = occupancyTermss.filter((lease) => {
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
      this.endActiveContracts(subsidyAgreementId, Dat.getDayBefore(startDate));
    }
    this.contractSheet.appendRowWithVals({
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
      contract.updateValue("endDate", endDate);
    });
  }
}
