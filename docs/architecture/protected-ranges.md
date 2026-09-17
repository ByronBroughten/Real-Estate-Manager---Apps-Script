# Protected ranges (edit warnings and edit locks)

Map fragment. Sibling headings live in this folder.


A protection is an **edit warning** or an **edit lock**. The Google API type stays `ProtectedRange` at the adapter boundary, the way `ConditionalFormat` does. A warning prompts anyone, the owner included, and still lets the edit through; a lock names who may edit and never stops the owner. A lock takes optional `users` and `groups`. Unprotected ranges are representable only on a whole-sheet declaration.

Reads use a plain spreadsheet get with a `protectedRanges` fields mask, never `getByDataFilter` (assumed to drop them, like conditional formats, until the probe says otherwise). Google omits an empty list, so a sheet missing from that read's protections has none, not "unfetched"; it omits zero-valued range fields the same way, which read back as 0. A range with no row or column bounds at all is a whole sheet. Google lists `editors` on a warning too (live: two users and a service account); a warning reads back with no users or groups, since it never uses them.

Every protection the payload holds is mapped, one for one, in order. A protection backed by a named range or a Table, or that sets `domainUsersCanEdit`, becomes an explicit unmodelable value that still carries its id and can still be removed by id. Google's `ProtectedRange` has no Table id; a Table-backed protection is unmodelable when it carries `namedRangeId`, which is the only Table signal on that resource.

Identity is content: range, kind, editors, unprotected ranges and description. An add queues nothing when a fetched or already-queued protection matches it on everything but editors and holds every editor it declares; Google adds its own editors to a lock (live: a lock naming none came back with the same two users and service account as the warning), so an exact editor match would re-add it every run. Removal is by exact range, exact content, description or id — never by overlap — so a hand-set protection is left alone until it is named.

The update queue emits delete-protection then add-protection after the conditional-format adds and before raw requests. Deletes are by id. A write whose range or unprotected ranges carry row coordinates refuses to queue while that sheet's row indexes are stale. A whole-sheet protection with no unprotected ranges is exempt. A flush that added or deleted a protection marks that sheet's protection list stale; reading or mutating it again requires a refetch. The add reply carries the new id; the framework does not integrate it, because the refetch is required.

Named structures: the sheet data range (`addEditWarning` / `addEditLock`), the whole sheet (`…WholeSheet`), a bookkeeping row or the Table header row, a column's data range, a column's header / column-ID / column-group heading cell, and a single cell. Raw has a whole-row range helper.

The probe that decides whether a data-column floor protection is bounded or open-ended has not run yet.
