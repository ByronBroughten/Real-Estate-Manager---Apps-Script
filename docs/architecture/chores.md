# Chores

Map fragment. Sibling headings live in this folder.


A **chore** is a unit of work run from the terminal against the live spreadsheet — the permanent home for the jobs that used to be improvised one route at a time. `npm run chore` and the dry run are documented in [`how-it-runs.md`](../how-it-runs.md); this is where one goes.

**One typed exported const per file, named after its file**, mirroring how an endpoint entry is written: a short `description` the runner prints, and an `action` that receives the spreadsheet. The description is what makes a durable chore legible a year later. `Chore.ts` holds the type.

**Chores are found by folder and filename, not a registry.** Nothing dispatches on a chore's name except the person typing it, so a registry would add churn in a shared file for no checking benefit. That is the deliberate difference from endpoints, where the framework dispatches on the key and the registry earns its place.

**Three homes, by how long the work lasts:**

- **`src/chores/oneOff/`** — transient chores, deleted in the commit that records their run. The folder is meant to empty; a chore left there goes stale against a sheet shape that no longer exists.
- **`src/chores/`** — durable chores, kept. `addMissingColumnIds` and `fillMissingRowIds` are the two, both converted out of a scratch function in `src/index.ts`. A twice-a-year repair belongs here rather than earning a column and a checkbox on a sheet.
- **The framework tiers** — anything generalizable. A job that wants a capability the framework does not model is the evidence that the capability is worth building.

**Chores are not tested**, and that is deliberate: a test for a one-off would be a second statement of the same thing, written by the same hand in the same hour, and its real check is the preview read before saying send. Durable chores are the arguable middle and are still skipped. A chore that no longer type-checks against the current configs surfaces under `npm run tsc`, which is the intended failure.

