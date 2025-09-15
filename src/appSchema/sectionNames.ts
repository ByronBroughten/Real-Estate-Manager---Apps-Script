function enforceSectionNamesBase<T extends readonly string[]>(t: T): T {
  return t;
}

export const sectionNames = enforceSectionNamesBase([
  "unit",
  "household",
  "householdChargeOnetime",
  "addHouseholdChargeOnetime",
] as const);

type EnforceSectionNameSimple<Arr extends readonly string[]> = Arr[number];

export type SectionNameSimple = EnforceSectionNameSimple<typeof sectionNames>;
export type SectionName<S extends SectionNameSimple = SectionNameSimple> = S;
