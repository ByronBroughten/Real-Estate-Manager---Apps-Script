# Rules for the app's `src/chores/`

- **`npm run app:chore <name>` is a dry run and always safe**: the Node host adapter suppresses its writes.
- **`npm run app:chore <name> -- --send` writes to the live real-estate sheet and needs a yes naming that chore.** A general go-ahead is not that yes, and `dev:chore`'s standing yes never covers it.
- **Verify a dry run's preview before handing it over**: compare the rendered requests with what the chore was meant to do, and call out anything wrong or larger than intended.
- **`oneOff/` is for transient chores, deleted in the commit that records their run.** A chore needed again belongs here or in the framework. Homes: [`chores.md`](../../../framework/docs/architecture/chores.md).
