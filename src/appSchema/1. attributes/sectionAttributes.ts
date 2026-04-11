import { Arr } from "../../utils/Arr";
import { Obj } from "../../utils/Obj";
import { makeSchemaStructure, type MakeSchemaName } from "../makeSchema";

type SectionAttributesBase = {
  idPrepend: string;
  sheetId: number;
};

type AllSectionAttributesBase = Record<string, SectionAttributesBase>;

type Section<IP extends string, SI extends number> = {
  idPrepend: IP;
  sheetId: SI;
  topBodyRowIdxBase1: number;
};

export const headerRowIdxBase1 = 2;
const defaultTopBodyRowIdxBase1 = headerRowIdxBase1 + 1;
function makeAttributes<IP extends string, SI extends number>(
  idPrepend: IP,
  sheetId: SI,
  topBodyRowIdxBase1: number = defaultTopBodyRowIdxBase1,
): Section<IP, SI> {
  return { idPrepend, sheetId, topBodyRowIdxBase1 } as Section<IP, SI>;
}

const ma = makeAttributes;

export const allSectionAttributes = makeSchemaStructure(
  {} as AllSectionAttributesBase,
  {
    test: ma("tst", 2089200354),
    api: ma("api", 290870631),
    hhLedger: ma("hl", 731807482),
    hhCharge: ma("hhc", 825934775),
    hhLease: ma("hlco", 445175805),
    addHhChargeOnetime: ma("ahhc", 1202471195, defaultTopBodyRowIdxBase1 + 1),
    hhPayment: ma("hhp", 1544131100),
    hhPaymentAllocation: ma("hpa", 348639454),
    addHhPaymentOnetime: ma("ahhp", 1485718763, defaultTopBodyRowIdxBase1 + 1),
    paymentGroup: ma("pg", 939656506),
    unit: ma("un", 321313883),
    household: ma("hh", 0),
    expense: ma("ex", 449009036),
    addExpenses: ma("aex", 1964495656, defaultTopBodyRowIdxBase1 + 1),
    subsidyProgram: ma("sp", 332858329),
    subsidyAgreement: ma("sa", 1155067179),
    subsidyContract: ma("sc", 194710324),
    hhPet: ma("hp", 560379920),
    otherPayer: ma("op", 471889863),
  } as const,
);

export const sectionNames = Obj.keys(allSectionAttributes);
export type SectionNameSimple = MakeSchemaName<typeof sectionNames>;

export function validateSnObj<T extends Partial<Record<SectionName, unknown>>>(
  t: T,
): T {
  return t;
}

export type AllSectionAttributes = typeof allSectionAttributes;

export type SectionAttributes<SN extends SectionNameSimple> =
  AllSectionAttributes[SN];

export type SectionName<S extends SectionNameSimple = SectionNameSimple> = S;

const sectionNameGroups = {
  aggregateApi: Arr.extractStrict(sectionNames, [
    "addHhChargeOnetime",
    "addHhPaymentOnetime",
    "addExpenses",
  ] as const),
  ledgerInputs: Arr.extractStrict(sectionNames, [
    "hhCharge",
    "hhPaymentAllocation",
  ] as const),
} as const;

type SectionNameGroups = typeof sectionNameGroups;
export type SnGroupName = keyof SectionNameGroups;

export type GroupSectionName<GN extends SnGroupName> =
  SectionNameGroups[GN][number];

export function isInSnGroup<GN extends SnGroupName>(
  groupName: GN,
  sn: string,
): sn is GroupSectionName<GN> {
  return (sectionNameGroups[groupName] as string[]).includes(sn);
}
