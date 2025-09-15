import type { SectionNameSimple } from "./sectionNames";

type SectionBase = {
  headerIndex: number;
  rangeName: string;
};

type SectionsBase = {
  [S in SectionNameSimple]: Record<string, SectionBase>;
};

const standardSectionProps = {
  headerIndex: 1,
} as const;

type StandardSectionProps = typeof standardSectionProps;

function makeSectionBase<SN extends SectionNameSimple>(sectionName: SN) {}
// I need the utility types from the other project.
// Also which setions do I really need for immediate functionality I'm pursuing?

export const sections = enforceSectionsBase({
  unit: {},
  household: {},
  householdChargeOnetime: {},
  addHouseholdChargeOnetime: {},
});

export type Sections = typeof sections;

function enforceSectionsBase<T extends SectionsBase>(t: T): T {
  return t;
}
