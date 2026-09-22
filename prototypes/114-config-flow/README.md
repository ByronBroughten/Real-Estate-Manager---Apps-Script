# PROTOTYPE #114: throwaway, never merge

Question: how should an app's generated configs reach framework tiers 01–06? Each variant is the same thin slice: `SheetNamed<SN>` reads and writes a typed column and reads a header from config *values*, and `Api` dispatches one endpoint by sheet gid. Each variant has two programs: `framework/` (checked against `fixtureConfigs.ts`, with no real-estate names) and `app/` (checked against `realConfigs/`, a copy of the real 37-sheet generated configs).

Run it from this folder:

```sh
for v in 1-registry 2-generics 3-alias; do for p in framework app; do npx tsc -p $v/$p/tsconfig.json && echo "$v/$p ok"; done; done
npx tsx 1-registry/app/main.ts
npx tsx 2-generics/app/main.ts
npx tsx --tsconfig 3-alias/app/tsconfig.json 3-alias/app/main.ts
```

Every `@ts-expect-error` holds in every variant: wrong value types and the other set's sheet names are rejected.

## Compare the call sites

- `1-registry/app/main.ts` + `registerConfigs.ts`
- `2-generics/app/main.ts` + `configs.ts` (the alias layer the app has to write)
- `3-alias/app/main.ts` (no setup file at all)

## Findings

| | 1 Registry | 2 Generics | 3 `#generated` alias |
| --- | --- | --- | --- |
| Framework tier code | Tiers read `Configs` from `Register`; derived module consts (`sheetConfigsByGid`) become lazy | Every class and helper gains `C` (`SheetNamed<C, SN>`, `ColumnValue<C, SN, CN>`), ~63 files | Unchanged: `./generated/x` becomes `#generated/x` |
| App call sites | Unchanged: `SheetNamed<"unit">` | Unchanged *only through* an app alias module that pins `C` | Unchanged |
| Runtime values | Separate `registerConfigs()` call. Forgetting it still type-checks and throws at runtime (probe B) | Passed into `Api`, carried on every instance | Imported as today, including module-level derivations |
| Framework tests' fixtures | An augmentation file in the framework program | Pass `fixture` to the constructor | The framework's own `generated/` via its tsconfig |
| Two sets in one `tsc` program | No: the second augmentation breaks the first with confusing errors, not a clean diagnostic (probe A) | **Yes** (`2-generics/app/main.ts` builds a fixture `Api` alongside the app's) | No, by construction (one resolution per program) |
| Augmenting through the curated entry | Works: `declare module "<entry>"` merges into the re-exported interface | n/a | n/a |
| Build wiring | None | None | `paths` in each tsconfig, plus a rollup alias and a vitest alias per package |
| App-program check (thin slice) | ~110k instantiations, 0.23s | **~4k, 0.09s** | ~110k, 0.22s |

About the cost row: ~109k of variants 1 and 3 comes from merely *importing* the framework. Its generic method bodies get checked against the app's concrete sheet union, which is the "filter at widened sheet name" cost in `docs/architecture/type-check-cost.md`. In variant 2 those bodies are checked once, against an abstract `C`. This is a thin slice, so the gap at full scale is unmeasured. Variants 1 and 3 should cost what the codebase pays today (~690k against the 750k budget).
