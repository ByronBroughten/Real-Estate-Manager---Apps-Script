type SectionBase = {
  headerIndex: number; // almost always 1
  sheetId: string; // I'll primarily, or perhaps exclusively, use sheet ids and data ranges.
  idPrepend: string; // e.g. p- for property, u- for unit, h- for household.
};
