# Test code style

Disclosed from [`docs/style.md`](../style.md). How tests run, and the fakes: [`docs/testing.md`](../testing.md).

**This is a draft, not settled like docs/style.md; docs/style.md's Tests section holds the settled test rules.** Every docs/style.md rule was mined from a file the user refactored personally; test files haven't had that pass yet, so `*.test.ts` doesn't represent the house style. These rules are proposed extensions in the same spirit. Revisit them once a real test file has been through the user's own refactor, the way `ConfigCoordinator.ts` was for production code.

All of docs/style.md applies to test code as-is.

## Draft test rules

- **Understand a class from its implementation.** Open the sibling `Foo.test.ts` when changing tests.
- **Use a named setup function instead of a comment explaining a seeded row.** Instead of `// Pre-existing row for the "test" sheet, with API access so its column IDs get gathered` beside a literal, write `seedActiveSheetWithApiAccess()`, so the call site states the scenario.
- **One behavior per `it()`, named as a sentence describing the behavior, not the mechanism**: `"flushes Sheet Config and Column Config changes in a single batchUpdate call"`.
- **Name `describe` blocks after the real method or class under test**, not an invented suite label: `describe("syncAndFlushConfigSheets", ...)`, `describe("ColumnConfigOperator.columnEntries / toFileSource", ...)`.
- **Use real, already-committed schema data over invented literals** wherever the code under test resolves identifiers through the actual schema (column IDs via `columnConfigs.sheetConfig.x.columnId`, real sheet gids). This stops a test from passing against a shape that doesn't exist in production.
- **Assert precisely**: the exact resulting value or shape, not presence or truthiness.

## Exemplar columns for type-level tests

docs/style.md's settled rule asks a type-level test for an exemplar column whose value name can't churn under `gen:configs`. A config sheet's column qualifies, and so does a column of the live `test` sheet.
