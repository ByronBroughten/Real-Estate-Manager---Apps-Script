# Rules for `src/chores/`

- **`npm run chore <name>` is a dry run and always safe**: the Node host adapter suppresses its writes.
- **`npm run chore <name> -- --send` writes to the live sheet and needs a yes naming that chore.** A general go-ahead is not that yes.
- **A chore is a one-off job run from the terminal**, never imported by `src/index.ts`. Homes and conventions: [`docs/architecture/chores.md`](../../docs/architecture/chores.md).
