import type { SectionNameSimple } from "../sectionNames";

const SectionRelationships = ["parent", "self", "child", "none"] as const;
export type SectionRelationship = (typeof SectionRelationships)[number];

export type IdValueParams = {
  sectionName: SectionNameSimple;
  relationship: SectionRelationship;
};
