import type { UnionObj } from "../../utils/Obj/UnionObj";
import type { SectionNameSimple } from "../sectionNames";

export type IdBase = {
  ID: string;
  sectionName: string;
  relationship: "parent" | "self" | "child" | "none";
};

type Id<SN extends SectionNameSimple = SectionNameSimple> = {
  ID: string;
  sectionName: SN;
  relationship: "parent" | "self" | "child" | "none";
};

type VarbBase =
  | {
      type: "id";
      params: {
        sectionName: string;
        relationship: "parent" | "self" | "child" | "none";
      };
    }
  | UnionObj<"">;

{
  type: "string" | "number" | "boolean" | "date";
  params: {
  }
} // get your utility types from the other project to make this a union of objects.
