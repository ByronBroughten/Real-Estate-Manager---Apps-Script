import type { SectionNameSimple } from "../sectionAttributes";

const onDelete = ["delete", "setEmpty", "keep"] as const;
type OnDelete = (typeof onDelete)[number];

export type LinkedIdParams = {
  sectionName: SectionNameSimple;
  onDelete: OnDelete;
};
