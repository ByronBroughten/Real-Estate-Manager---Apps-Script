# Test code style

Disclosed from [`docs/style.md`](../style.md).

**This is a draft, not settled like docs/style.md; docs/style.md's Tests section holds the settled test rules.** Every docs/style.md rule was mined from a file the author refactored personally; test files haven't had that pass yet, so `*.test.ts` doesn't represent the house style. These rules are proposed extensions in the same spirit. Revisit them once a real test file has been through the author's own refactor, the way production code was.

All of docs/style.md applies to test code as-is.

## Draft test rules

- **Understand a class from its implementation.** Open the sibling `Foo.test.ts` when changing tests.
- **Use a named setup function instead of a comment explaining a seeded row.** Instead of `// Pre-existing row for the "test" table, with API access so its column IDs get gathered` beside a literal, write `seedTableWithApiAccess()`, so the call site states the scenario.
- **One behavior per `it()`, named as a sentence describing the behavior, not the mechanism**: `"flushes table and column changes in a single batch call"`.
- **Name `describe` blocks after the real method or class under test**, not an invented suite label: `describe("syncAndFlush", ...)`, `describe("ColumnOperator.columnEntries / toFileSource", ...)`.
- **Assert precisely**: the exact resulting value or shape, not presence or truthiness.
