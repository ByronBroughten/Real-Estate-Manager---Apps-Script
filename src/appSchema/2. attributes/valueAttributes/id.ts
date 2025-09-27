import type { SectionNameSimple } from "../../1. names/sectionNames";

const SectionRelationships = ["parent", "child", "none"] as const;
export type SectionRelationship = (typeof SectionRelationships)[number];

export type LinkedIdParams = {
  sectionName: SectionNameSimple;
  relationship: SectionRelationship;
};
