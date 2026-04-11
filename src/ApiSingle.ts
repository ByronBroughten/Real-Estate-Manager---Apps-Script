import type { SectionValues } from "./appSchema/1. attributes/varbAttributes";
import { OperatorBase } from "./StateHandlers/HandlerBases/OperatorBase";
import { LeaseMgmt } from "./StateHandlers/LeaseMgmt";
import { LedgerMgmt } from "./StateHandlers/LedgerMgmt";
import type { Row } from "./StateHandlers/Row";
import type { Sheet } from "./StateHandlers/Sheet";
import type { Spreadsheet } from "./StateHandlers/Spreadsheet";
import { SubsidyMgmt } from "./StateHandlers/SubsidyMgmt";
import type { StandardEvent } from "./TopOperator";
import {
  Obj,
  type InvertObj,
  type PickStartsWith,
  type PropKeyOfValue,
  type RemoveFirstNFromKeys,
  type StrictOmit,
} from "./utils/Obj";
import { Str, type CombineStrings, type TakeFirstN } from "./utils/Str";

type AllApiValues = StrictOmit<SectionValues<"api">, "idFormula" | "baseId">;

type ApiPrefixBase = TakeFirstN<keyof AllApiValues, 3>;
type ApiPrefixToFnNameBase = {
  [K in ApiPrefixBase]: string;
};
function validatePrefixToFnName<T extends ApiPrefixToFnNameBase>(obj: T): T {
  return obj;
}
const apiPrefixToFnName = validatePrefixToFnName({
  BHL: "buildHhLedger",
  UPC: "updatePeriodicCharges",
  ULS: "updateLeasesAndSubsidyContracts",
} as const);

type ApiPrefixToFnName = typeof apiPrefixToFnName;
type ApiFnNameToPrefix = InvertObj<ApiPrefixToFnName>;
type ApiFnName = ApiPrefixToFnName[ApiPrefixBase];
type ApiPrefix<FN extends ApiFnName> = ApiFnNameToPrefix[FN];

type ApiValuesWithPrefix<FN extends ApiFnName> = PickStartsWith<
  AllApiValues,
  TakeFirstN<PropKeyOfValue<ApiPrefixToFnName, FN>, 3>
>;

export type ApiFnValues<FN extends ApiFnName> = RemoveFirstNFromKeys<
  ApiValuesWithPrefix<FN>,
  3
>;

type ApiFns = {
  [FN in ApiFnName]: (values: ApiFnValues<FN>) => void;
};

export class ApiSingle<FN extends ApiFnName> extends OperatorBase {
  constructor(ss: Spreadsheet, event: StandardEvent) {
    super(ss);
    this.event = event;
    this.apiSheet = this.sheet("api");
  }
  private apiFnName: FN;
  readonly apiSheet: Sheet<"api">;
  readonly event: StandardEvent;

  readonly subsidyMgmt = new SubsidyMgmt(this.ss);
  get apiRow(): Row<"api"> {
    return this.apiSheet.topBodyRow;
  }
  get apiFnVarbNames(): (keyof ApiValuesWithPrefix<FN>)[] {
    return this.apiSheet.varbNames.filter((vn) =>
      vn.startsWith(this.apiPrefix),
    ) as (keyof ApiValuesWithPrefix<FN>)[];
  }
  get prefixLength() {
    return 3;
  }
  get apiPrefix(): ApiFnNameToPrefix[FN] {
    return Obj.keyByValue(apiPrefixToFnName, this.apiFnName);
  }
  private apiFns: ApiFns = {
    updateLeasesAndSubsidyContracts: (values) => {
      const leaseMgmt = new LeaseMgmt(this.ss);
      leaseMgmt.doPeriodicLeaseUpdates();

      const subsidyMgmt = new SubsidyMgmt(this.ss);
      subsidyMgmt.doPeriodicSubsidyUpdates();

      this.standardCleanup();
      this.apiRow.setValues({ ULSdateLastRan: new Date() });
    },
    updatePeriodicCharges: (values) => {
      "TODO";
      this.standardCleanup();
    },
    buildHhLedger: (values) => {
      new LedgerMgmt(this.ss).buildHhLedger(values);
      this.standardCleanup();
      this.apiRow.setValues({
        BHLdateLastRan: new Date(),
        BHLhhIdLastRan: values.householdId,
      });
    },
  };

  private standardCleanup() {
    this.apiSheet.topBodyRow.resetToDefault(this.apiFnVarbNames);
  }

  private apiVarbName<B extends "enter" | "enterStatus">(
    base: B,
  ): CombineStrings<ApiPrefix<FN>, B> {
    return Str.combineStrings(this.apiPrefix, base);
  }
  private apiValuesWithPrefix(): ApiValuesWithPrefix<FN> {
    const topRow = this.apiSheet.topBodyRow;
    const values = topRow.validateValues() as AllApiValues;
    return Obj.pickStartsWith(
      values,
      this.apiPrefix,
    ) as unknown as ApiValuesWithPrefix<FN>;
  }
  private apiValues<FN extends ApiFnName>(): ApiFnValues<FN> {
    const withPrefix = this.apiValuesWithPrefix();
    return Obj.removeFirstNFromKeys(
      withPrefix,
      this.prefixLength,
    ) as unknown as ApiFnValues<FN>;
  }
  handleEvent() {
    this.isValidApiTriggered() && this.tryCallApi();
  }
  private isValidApiTriggered() {
    const api = this.apiSheet;
    const header = api.headerByColIdxBase1(this.event.colIdxBase1);

    const isTopBodyRow = this.event.rowIdxBase1 === api.topBodyRowIdxBase1;
    const isEnter = header.slice(-5) === "enter";
    const prefix = header.slice(0, 3);
    const isValidPrefix = prefix in apiPrefixToFnName;
    if (isTopBodyRow && isEnter && isValidPrefix) {
      this.apiFnName = apiPrefixToFnName[prefix as ApiPrefixBase] as FN;
      return true;
    } else {
      return false;
    }
  }
  private tryCallApi() {
    this.prepCallApi();
    try {
      this.callApi();
      this.batchUpdateRanges();
    } catch (e) {
      this.handleApiCallError(e as Error);
    }
  }
  private prepCallApi() {
    const topRow = this.apiSheet.topBodyRow;
    const varbName = this.apiVarbName("enterStatus");
    topRow.setValue(varbName, "Processing...");
    this.batchUpdateRanges();
  }
  private callApi() {
    this.apiFns[this.apiFnName](this.apiValues());
  }
  private handleApiCallError(error: Error) {
    console.error(error);
    this.apiSheet.topBodyRow.setValue(
      this.apiVarbName("enterStatus"),
      "Error: " + (error as Error).message,
    );
    this.batchUpdateRanges();
    throw error;
  }
}
