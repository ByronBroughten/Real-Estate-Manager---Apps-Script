import type { SectionNameSimple } from "../../1. names/sectionNames";

const onDelete = ["delete", "setEmpty"] as const;
type OnDelete = (typeof onDelete)[number];

export type LinkedIdParams = {
  sectionName: SectionNameSimple;
  onDelete: OnDelete;
};
