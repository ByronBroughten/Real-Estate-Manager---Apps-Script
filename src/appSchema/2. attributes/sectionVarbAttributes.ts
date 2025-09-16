import type { StrictExtract } from "../../utils/Arr";
import type { Merge } from "../../utils/Obj/merge";
import { type SectionNameSimple } from "../1. names/sectionNames";
import type { VarbName } from "../1. names/sectionVarbNames";
import type { ValueName } from "../1. names/valueNames";
import type { IdValueParams } from "./valueAttributes/id";

type ValueParamsBase = {} | IdValueParams;
type ValueNameToParams = Merge<
  Record<ValueName, {}>,
  Record<StrictExtract<ValueName, "id">, IdValueParams>
>;
type ValueParams<VN extends ValueName> = ValueNameToParams[VN];

type VarbBase = {
  valueName: ValueName;
  ValueParams: ValueParamsBase;
};
type Varb<
  VLN extends ValueName = ValueName,
  VLP extends ValueParams<VLN> = ValueParams<VLN>
> = {
  valueName: VLN;
  valueParams: VLP;
};

function makeVarb(valueName, valueParams) {
  return { valueName, valueParams };
}

type VarbsBase = Record<VarbName, VarbBase>;
type Varbs<SN extends SectionNameSimple, VB extends Varb = Varb> = Record<
  VarbName<SN>,
  VB
>;

function makeVarbs<SN extends SectionNameSimple, VBS extends Varbs<SN>>(
  varbs: VBS
) {
  return varbs;
}

// I gotta enforce a structure at every level I think.

// type SectionVarbs<SN extends SectionNameSimple> = {
//   [VN in VarbName<SN>]: Varb<
// }

// keep it simple or copy the last project.

// const sectionVarbsNext = makeSchemaDict(sectionNames, {} as VarbsBase, {
//   unit: mvp("ID", "id", {
//     sectionName: "unit",
//     relationship: "self",
//   }),
//   household: mvp("ID", "id", {
//     sectionName: "household",
//     relationship: "self",
//   }),
//   householdChargeOnetime: {
//     ...mvp("ID", "id", {
//       sectionName: "householdChargeOnetime",
//       relationship: "self",
//     }), //here's where I need the ID parameters
//     ...mvp("Date", "date", {}),
//   },
//   addHouseholdChargeOnetime: {
//     ...mvp("ID", "id", {
//       sectionName: "addHouseholdChargeOnetime",
//       relationship: "self",
//     }),
//   },
// });
