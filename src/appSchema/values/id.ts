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
      idParams: {
        sectionName: string;
        relationship: "parent" | "self" | "child" | "none";
      };
    }
  | {
      type: "string" | "number" | "boolean" | "date";
      idParams: null;
    }; // get your utility types from the other project to make this a union of objects.
