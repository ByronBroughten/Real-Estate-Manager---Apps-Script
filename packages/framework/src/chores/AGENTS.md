# Rules for `src/chores/`

- **A chore's dry run is always safe**: the Node host adapter suppresses its writes.
- **`npm run dev:chore <name> -- --send` has a standing yes; `app:chore … --send` needs a yes naming that chore** ([targets-and-gates](../../../../docs/targets-and-gates.md#targets-dev-and-app)). One never covers the other.
- **Verify a dry run's preview before handing it over**: compare the rendered requests with what the chore was meant to do, and call out anything wrong or larger than intended.
- **A chore is a one-off job run from the terminal**, never imported by `src/index.ts`. Homes and conventions: [`docs/architecture/chores.md`](../../docs/architecture/chores.md).
