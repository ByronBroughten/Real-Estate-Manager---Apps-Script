import { Obj, type KeyedMap } from "../utils/Obj";
import { makeSchemaStructure } from "./0.1 makeSchema";

interface TableAttributesBase {
  sheetGid: number;
  idPrefix: string;
}

function makeTableAttributes(
  sheetGid: number,
  idPrefix: string,
): TableAttributesBase {
  return {
    sheetGid,
    idPrefix,
  };
}
const mta = makeTableAttributes;
type AllTableAttributesBase = Record<string, TableAttributesBase>;
const allTableAttributes = makeSchemaStructure({} as AllTableAttributesBase, {
  allTableAttributes: mta(210603630, "stm"),
  config: mta(1967106628, "vrb"),
  validationList: mta(2119236084, "rng"),
  year: mta(243663296, "yer"),
  api: mta(290870631, "api"),
  buildOccLedger: mta(706564734, "bol"),
  addOccChargeOnetime: mta(1202471195, "aoco"),
  addHhPaymentOnetime: mta(1485718763, "aopo"),
  addExpenses: mta(1964495656, "ape"),
  propertyProspect: mta(87312116, "ppr"),
  householdProspect: mta(1631083349, "hpr"),
  tenantPros: mta(522260317, "rpr"),
  property: mta(619816967, "prp"),
  furnace: mta(1237193065, "frn"),
  unit: mta(321313883, "unt"),
  resident: mta(1934805379, "rsd"),
  pet: mta(560379920, "pet"),
  household: mta(0, "hsh"),
  occupancy: mta(1079739305, "occ"),
  nonResidentPayer: mta(471889863, "nrp"),
  paymentGroup: mta(939656506, "pgr"),
  occupancyTerms: mta(445175805, "otr"),
  occCharge: mta(825934775, "och"),
  occChargeReduce: mta(1817648883, "ocr"),
  occPayment: mta(1544131100, "opy"),
  occPayAllocation: mta(348639454, "opa"),
  subsidyWorker: mta(1281153954, "swr"),
  subsidyProgram: mta(332858329, "spr"),
  subsidyAgreement: mta(1155067179, "sag"),
  subsidyTerms: mta(194710324, "str"),
  subsidyCharge: mta(1467694925, "sch"),
  subsidyPayment: mta(1105274181, "spy"),
  subPayAllocation: mta(186254136, "spa"),
  biller: mta(1536785367, "bil"),
  propertyExpense: mta(449009036, "pex"),
  businessExpense: mta(41846794, "bex"),
  propertyYear: mta(802789198, "pyr"),
  householdYear: mta(1452711715, "oyr"),
  hhLedger: mta(731807482, "old"),
  allColumnAttributes: mta(2034522667, "scm"),
  test: mta(2089200354, "tst"),
  export: mta(1246014413, ""),
  finance: mta(1814139876, ""),
  recurringTransaction: mta(443518874, ""),
  quotes: mta(2007051676, ""),
  rentComp: mta(368826933, ""),
  paymentStandard: mta(1485032491, "pst"),
  materialCost: mta(73926003, ""),
  capex: mta(1539440300, "cpx"),
  variable: mta(695651834, ""),
  valueName: mta(1529539239, ""),
});

export type AllTableAttributes = typeof allTableAttributes;
export type TableAttributes<TN extends TableNameSimple> =
  AllTableAttributes[TN];

export const allTableNames = Obj.keys(allTableAttributes);
export type TableNameSimple = (typeof allTableNames)[number];
export type SheetName<TN extends TableNameSimple = TableNameSimple> = TN;

export function getTableAttribute<
  TN extends TableNameSimple,
  K extends keyof TableAttributes<TN>,
>(sheetName: TN, key: K): TableAttributes<TN>[K] {
  return allTableAttributes[sheetName][key];
}

type AllTableAttributesByGid = KeyedMap<
  AllTableAttributes,
  "sheetGid",
  "sheetName"
>;
export const tableAttributesByGid = Obj.toKeyedMap(
  allTableAttributes,
  "sheetGid",
  "sheetName",
);

export const allSheetGids = [...tableAttributesByGid.keys()];

export type TableAttributesRaw =
  AllTableAttributesByGid extends Map<any, infer V> ? V : never;
export function getTableAttributeByGid<K extends keyof TableAttributesRaw>(
  sheetGid,
  key: K,
): TableAttributesRaw[K] {
  return tableAttributesByGid[sheetGid][key];
}
