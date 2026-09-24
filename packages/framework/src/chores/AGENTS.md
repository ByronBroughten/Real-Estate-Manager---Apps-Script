# Rules for `src/chores/`

- **`npm run app:chore <name>` is a dry run and always safe**: the Node host adapter suppresses its writes.
- **`npm run app:chore <name> -- --send` writes to the live sheet and needs a yes naming that chore.** A general go-ahead is not that yes. `dev:chore` has a standing yes, which never covers `app:chore`.
- **Verify a dry run's preview before handing it over**: compare the rendered requests with what the chore was meant to do, and call out anything wrong or larger than intended.
- **A chore is a one-off job run from the terminal**, never imported by `src/index.ts`. Homes and conventions: [`docs/architecture/chores.md`](../../../../docs/architecture/chores.md).
