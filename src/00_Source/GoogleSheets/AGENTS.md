# Rules for `src/00_Source/GoogleSheets/`

- **This folder is the only code, besides the entry points, allowed to know the platform**: `GoogleAppsScript.*` types, `SpreadsheetApp`, the Sheets service.
- **Everything outside reaches it through the `RawSource` port** in `../RawSource/`. Translate here, and hand back platform-neutral types.
- **It still touches no Node or DOM API**: both hosts run it.
