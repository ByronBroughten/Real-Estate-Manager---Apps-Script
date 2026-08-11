import { Obj, type KeyedMap } from "../utils/Obj";
import { makeStructuredConfig } from "./0.0 ConfigPrecursors";

export interface SheetConfig {
  sheetGid: number;
  idPrefix: string;
  hasIdColumn: boolean;
}
function makeSheetConfig(
  sheetGid: number,
  idPrefix: string,
  hasIdColumn = false,
): SheetConfig {
  return {
    sheetGid,
    idPrefix,
    hasIdColumn,
  };
}
const msc = makeSheetConfig;
type SheetConfigsBase = Record<string, SheetConfig>;
const sheetConfigs = makeStructuredConfig({} as SheetConfigsBase, {
  sheetConfig: msc(210603630, "stm"),
  config: msc(1967106628, "vrb"),
  validationList: msc(2119236084, "rng"),
  year: msc(243663296, "yer"),
  api: msc(290870631, "api"),
  buildOccLedger: msc(706564734, "bol"),
  addOccChargeOnetime: msc(1202471195, "aoco"),
  addHhPaymentOnetime: msc(1485718763, "aopo"),
  addExpenses: msc(1964495656, "ape"),
  propertyProspect: msc(87312116, "ppr"),
  householdProspect: msc(1631083349, "hpr"),
  tenantPros: msc(522260317, "rpr"),
  property: msc(619816967, "prp"),
  furnace: msc(1237193065, "frn"),
  unit: msc(321313883, "unt"),
  resident: msc(1934805379, "rsd"),
  pet: msc(560379920, "pet"),
  household: msc(0, "hsh"),
  occupancy: msc(1079739305, "occ"),
  nonResidentPayer: msc(471889863, "nrp"),
  paymentGroup: msc(939656506, "pgr"),
  occupancyTerms: msc(445175805, "otr"),
  occCharge: msc(825934775, "och"),
  occChargeReduce: msc(1817648883, "ocr"),
  occPayment: msc(1544131100, "opy"),
  occPayAllocation: msc(348639454, "opa"),
  subsidyWorker: msc(1281153954, "swr"),
  subsidyProgram: msc(332858329, "spr"),
  subsidyAgreement: msc(1155067179, "sag"),
  subsidyTerms: msc(194710324, "str"),
  subsidyCharge: msc(1467694925, "sch"),
  subsidyPayment: msc(1105274181, "spy"),
  subPayAllocation: msc(186254136, "spa"),
  biller: msc(1536785367, "bil"),
  propertyExpense: msc(449009036, "pex"),
  businessExpense: msc(41846794, "bex"),
  propertyYear: msc(802789198, "pyr"),
  householdYear: msc(1452711715, "oyr"),
  hhLedger: msc(731807482, "old"),
  columnConfig: msc(2034522667, "scm"),
  test: msc(2089200354, "tst"),
  export: msc(1246014413, ""),
  finance: msc(1814139876, ""),
  recurringTransaction: msc(443518874, ""),
  quotes: msc(2007051676, ""),
  rentComp: msc(368826933, ""),
  paymentStandard: msc(1485032491, "pst"),
  materialCost: msc(73926003, ""),
  capex: msc(1539440300, "cpx"),
  variable: msc(695651834, ""),
  valueName: msc(1529539239, ""),
});

export type SheetConfigs = typeof sheetConfigs;

export const allSheetNames = Obj.keys(sheetConfigs);
export type SheetNameSimple = (typeof allSheetNames)[number];
export type SheetName<TN extends SheetNameSimple = SheetNameSimple> = TN;

export function getSheetTraitByName<
  TN extends SheetNameSimple,
  K extends keyof SheetConfig,
>(sheetName: TN, key: K): SheetConfig[K] {
  return sheetConfigs[sheetName][key];
}

type SheetTraitsByGid = KeyedMap<SheetConfigs, "sheetGid", "sheetName">;
export const sheetTraitsByGid = Obj.toKeyedMap(
  sheetConfigs,
  "sheetGid",
  "sheetName",
);

export const schemaSheetGids = [...sheetTraitsByGid.keys()];

type SheetTraitsRaw = SheetTraitsByGid extends Map<any, infer V> ? V : never;

export type SheetTraitRaw<K extends SheetTraitRawKey> = SheetTraitsRaw[K];

export type SheetTraitRawKey = keyof SheetTraitsRaw;
export function getSheetTraitByGid<K extends SheetTraitRawKey>(
  sheetGid,
  key: K,
): SheetTraitRaw<K> {
  return sheetTraitsByGid[sheetGid][key];
}
