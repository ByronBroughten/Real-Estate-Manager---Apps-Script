# npm workspaces mechanics for a framework + app split

Research for splitting this repo into an npm-workspaces monorepo: a `framework` package whose TypeScript source the `app` package bundles through rollup into one Apps Script bundle. Facts only, gathered 2026-09-22. "Observed" marks something run in a scratch experiment; everything else cites the owning project's docs or source.

## Verdicts

| # | Question | Verdict |
| --- | --- | --- |
| 1 | Import a workspace package's `.ts` source with no build step | **Yes, without project references.** `tsc` (bundler and nodenext), `tsx` and vitest 4 work as-is. `@rollup/plugin-typescript` 12 **silently externalizes the framework** under this repo's current `rootDir: ./src` and needs `filterRoot`/`rootDir` and `declaration: false` overrides (details below). |
| 2 | `exports` as the single public entry | **Enforced by tsc, tsx/Node and vitest; not by rollup** (it warns and externalizes). Relative paths escape it. ESLint `no-restricted-imports` with a `regex` pattern blocks both the deep specifier and relative escapes (observed). |
| 3 | vitest / ESLint / Prettier across packages | vitest `workspace` is gone in 4 (renamed `projects` in 3.2); a root `test.projects: ["packages/*"]` works (observed). One root ESLint flat config with `projectService` works across per-package tsconfigs (observed). Prettier resolves config per file upward, so one root config serves all packages. |
| 4 | clasp per package | clasp **3.1.3** is installed globally (none locally). It finds `.clasp.json` by walking up from cwd (`find-up`), or takes `-P <file or folder>`; `.claspignore` is read only beside the found `.clasp.json`. Per-package `.clasp.json` works; clasp 3 no longer transpiles TypeScript. |
| 5 | Scoping `@types/google-apps-script` | Ambient globals are **per program, not per package**: the app program must include the GAS types because it compiles framework source. A triple-slash reference in framework source leaks the globals into the app (observed). TypeScript 6.0 changes the `types` default to `[]`. |
| 6 | npm workspaces script/install behaviour | Scripts run with cwd = the package folder, and hoisted bins resolve from there (observed). **Git-subdirectory installs do not work in npm today**: npm 11.9+ parses `#ref::path:<dir>` but installs the whole repo root under the subpackage's name (observed on 11.12.1 and 11.19.1). npm 12 also blocks git dependencies by default. |

## 1. Importing a workspace package's TypeScript source

**Setup observed.** Scratch repo: root `package.json` with `"workspaces": ["packages/*"]`; `packages/framework/package.json` with `"exports": { ".": "./src/index.ts" }`, source using `GoogleAppsScript.Spreadsheet.Spreadsheet` in a type position and an extensionless relative import `./internal/helper`; `packages/app` depending on `"@ws/framework": "*"`. `npm install` (npm 11.7.0) symlinked `node_modules/@ws/framework -> ../../packages/framework`. Tool versions pinned to this repo's installed ones: typescript 5.9.2, rollup 4.54.0, @rollup/plugin-typescript 12.1.4, vitest 4.1.11, tsx 4.23.13, eslint 9.35.0, typescript-eslint 8.43.0.

### tsc

- **Observed (bundler):** with an app tsconfig mirroring this repo's (`rootDir: ./src`, `include: ["src/**/*.ts"]`, `declaration: true`, `noEmit: false`, `outDir: ./dist`), `tsc -p .` exits 0 and emits only the app's files. `--traceResolution` shows `@ws/framework` resolved through `exports` to `packages/framework/src/index.ts`.
- **Why no `rootDir` error:** TypeScript flags a module found via a `node_modules` lookup as an external library import, and `sourceFileMayBeEmitted` returns false for it (`if (host.isSourceFileFromExternalLibrary(sourceFile)) return false;`, `typescript/lib/typescript.js` 5.9.2 line 20375; source `src/compiler/utilities.ts` in [microsoft/TypeScript](https://github.com/microsoft/TypeScript/blob/main/src/compiler/utilities.ts)). The framework `.ts` files are type-checked but never emitted, so `rootDir` and `declaration` never apply to them. This held with `--preserveSymlinks` too (observed).
- **Framework errors surface in the app build (observed):** a deliberate type error in framework source failed the app's `tsc`. `skipLibCheck` only skips `.d.ts`, so the framework compiles under the **app's** compiler options (this repo's `strict: false`, `noUncheckedIndexedAccess`, `useDefineForClassFields: false`, etc.). The two tsconfigs must agree on anything that changes checking of framework code.
- **nodenext (observed):** `--module nodenext --moduleResolution nodenext` still resolved `@ws/framework` to the `.ts` file via `exports`, but failed on every extensionless relative import (TS2835) in both packages. This repo's source uses extensionless imports, so nodenext would require a sweep to `.js` (or `.ts` with `allowImportingTsExtensions`/`rewriteRelativeImportExtensions`). Resolution-mode support table: [TS modules reference](https://www.typescriptlang.org/docs/handbook/modules/reference.html) (bundler and node16/nodenext honour `exports`; node10 does not).
- **Project references / `composite` are not needed** and change the model: a referenced project's imports load its _output_ `.d.ts`, and `composite` requires `declaration` and that every implementation file be matched by `include` ([Project references](https://www.typescriptlang.org/docs/handbook/project-references.html)). That means a framework emit step, which the plan wants to avoid.
- **Relative imports into the framework do trip `rootDir` (observed):** `import ... from "../../../framework/src/internal/helper"` made the file a normal source file and produced TS6059 "not under 'rootDir'". The `rootDir` rule: "It is an error if files outside `rootDir` need to be emitted" ([tsconfig rootDir](https://www.typescriptlang.org/tsconfig/#rootDir)).

### tsx

**Observed:** `npx tsx src/run.ts` in the app printed the framework's output. tsx handled the extensionless relative import inside framework source under `node_modules/@ws/framework` (symlinked).

### vitest 4

**Observed:** `vitest run` inside `packages/app` passed a test that imports the app, which imports the framework's `.ts` source. No config needed.

### @rollup/plugin-typescript 12: the gotcha

**Observed, with this repo's config shape** (`typescript({ tsconfig: "./tsconfig.json" })`, tsconfig `rootDir: ./src`): rollup exited 0, printed `(!) Unresolved dependencies ... @ws/framework`, and wrote a bundle that still contains `import { greet, sheetName } from '@ws/framework';`. Apps Script cannot load that. The build "succeeds".

**Cause (plugin source, `dist/es/index.js` 12.1.4):**

- The filter is `createFilter(include || '{,**/}*.(cts|mts|ts|tsx)', exclude, { resolve: filterRoot ?? parsedOptions.options.rootDir })`. `@rollup/pluginutils` (5.4.0) joins relative globs onto that base (`posix.join(basePath, id)`), so the default include only matches `packages/app/src/**`. `resolveId` returns `null` when `!filter(resolved.resolvedFileName)`, and rollup then treats the import as external.
- README: `filterRoot` defaults to "`rootDir` ?? `tsConfig.compilerOptions.rootDir` ?? `process.cwd()`"; `false` disables resolving patterns against any directory ([plugin README](https://github.com/rollup/plugins/tree/master/packages/typescript)). Running rollup from the app folder without `rootDir` falls back to cwd, which has the same effect.
- The plugin deliberately un-flags `node_modules` imports that pass the filter: "If the module's path contains 'node_modules', ts considers it an external library and refuses to compile it, so we have to change the value of `isExternalLibraryImport` to false" (`createModuleResolver`). Once the framework passes the filter, its files become ordinary emitted sources in the plugin's program, so `rootDir` and `declaration` apply to them, unlike plain `tsc`.

**Observed fix sequence:**

1. `filterRoot: false`: framework resolved, but the build **failed**: `The "fileName" or "name" properties of emitted chunks and assets must be strings that are neither absolute nor relative paths, received "../../framework/src/internal/helper.d.ts"` (declaration emit outside the output dir).
2. `filterRoot: false, compilerOptions: { declaration: false }`: the bundle was correct (framework inlined), with a TS6059 `rootDir` **warning** per framework file.
3. `filterRoot: false, compilerOptions: { declaration: false, rootDir: "../.." }`: clean build, framework inlined. Dropping `filterRoot` there should also work, since the filter then resolves against the widened `rootDir`, but that was not run.

An alternative is an explicit `include` glob covering both packages. Either way, a `rollup` `onwarn` that throws on `UNRESOLVED_IMPORT` would turn the silent externalization into a failure. That was not tested; the warning code is rollup's documented [treating-module-as-external](https://rollupjs.org/troubleshooting/#warning-treating-module-as-external-dependency) case.

### `customConditions` ("source" condition) alternative

Pattern: `"exports": { ".": { "source": "./src/index.ts", "default": "./dist/index.js" } }`, and every tool opts into `source`. `customConditions` is valid only under node16/nodenext/bundler ([tsconfig customConditions](https://www.typescriptlang.org/tsconfig/#customConditions)).

**Observed:** without the condition, `tsc` failed TS2307, `tsx` failed `ERR_MODULE_NOT_FOUND` for `dist/index.js`, and vitest failed "Failed to resolve entry". It worked with `customConditions: ["source"]` in tsc, `tsx --conditions=source` (Node's `--conditions` flag, [Node packages](https://nodejs.org/api/packages.html)), and in vitest **only via `ssr.resolve.conditions: ["source"]`**. `resolve.conditions` alone still failed under `environment: "node"`. Vite documents `ssr.resolve.conditions` as the SSR plugin-pipeline conditions ([Vite SSR options](https://vite.dev/config/ssr-options)). The pattern only pays off if the framework ships a built `dist` for other consumers. With source-only `exports` it adds per-tool configuration for no gain.

## 2. `exports` as the single public entry

- **Rule:** "When the `exports` field is defined, all subpaths of the package are encapsulated and no longer available to importers ... throws an `ERR_PACKAGE_PATH_NOT_EXPORTED` error." It is "not a strong encapsulation since a direct require of any absolute subpath ... will still load" ([Node packages](https://nodejs.org/api/packages.html)). TypeScript: "the presence of `exports` prevents any subpaths not explicitly listed or matched by a pattern in `exports` from being resolved" ([TS modules reference](https://www.typescriptlang.org/docs/handbook/modules/reference.html)).
- **Observed per tool, importing `@ws/framework/src/internal/helper`:**
  - tsc: TS2307 "Cannot find module".
  - tsx: `ERR_PACKAGE_PATH_NOT_EXPORTED`.
  - vitest: `"./src/internal/helper" is not exported under the conditions ["node", "development", "import"]`.
  - rollup + plugin-typescript: **exit 0**, TS2307 shown only as a warning, and the import left external in the bundle.
- **Escapes observed:** `../../../framework/src/internal/helper` (sibling path) type-checks apart from the `rootDir` error described in section 1. `../../../../node_modules/@ws/framework/src/internal/helper` (through the symlink) type-checked with **no error at all**.
- **ESLint, observed working** in one root flat config scoped to `packages/app/src/**/*.ts`:

  ```js
  "no-restricted-imports": ["error", { patterns: [
    { group: ["@ws/framework/*"], message: "..." },
    { regex: "(^|/)framework/src(/|$)", message: "..." },
  ] }]
  ```

  It flagged the deep specifier and both relative escapes. Patterns match the raw import string, with gitignore-style `group` or `regex` ([no-restricted-imports](https://eslint.org/docs/latest/rules/no-restricted-imports)). The repo already uses this rule for tier boundaries, so this is one more pattern. `eslint-plugin-import-x`'s `no-internal-modules` (with `allow`/`forbid` globs) is the resolver-aware alternative ([rule docs](https://github.com/un-ts/eslint-plugin-import-x/blob/master/docs/rules/no-internal-modules.md)). It was not tested and would be a new dependency.

## 3. vitest, ESLint and Prettier across packages

- **vitest:** "The `workspace` configuration option was renamed to `projects` in Vitest 3.2 ... you cannot specify another file as the source of your workspace" ([Vitest 4 migration](https://v4.vitest.dev/guide/migration)). **Observed:** a stray `vitest.workspace.ts` was silently ignored by 4.1.11. A root `vitest.config.ts` with `test: { projects: ["packages/*"] }` ran both packages' tests, labelled `|@ws/framework|` and `|@ws/app|`. In Vitest 4, folders matched by a glob are projects even without a config, names come from the nearest `package.json` `name`, inline projects inherit root options only with `extends: true`, and `coverage`/`reporters` are root-only ([Vitest 4 projects](https://v4.vitest.dev/guide/projects)). This repo's root config also globs `scripts/**` and `.claude/hooks/**`, which would need their own project or root-level entry. Note: Vitest 5 is out and makes `extends: true` the default ([current projects page](https://vitest.dev/guide/projects)).
- **ESLint 9 flat config:** v9 looks for `eslint.config.*` from the **cwd** upward. The file-relative lookup is behind `--flag v10_config_lookup_from_file` in v9 ([v9 config files](https://eslint.org/docs/v9.x/use/configure/configuration-files)) and is the default in v10, which is current (10.11) ([latest config files](https://eslint.org/docs/latest/use/configure/configuration-files)). `files` globs are relative to the config file. npm flagged `eslint@9.35.0` as "no longer supported" on install (observed). So under v9, a root config plus a per-package `lint` script run from the package folder would miss the root config unless ESLint is launched from the root or given `-c`. One root config is simplest.
- **typescript-eslint `projectService`:** "will automatically use the nearest `tsconfig.json` for each file"; files in no tsconfig need `allowDefaultProject` ([parser docs](https://typescript-eslint.io/packages/parser/)); "requires no additional configuration for monorepos" ([monorepos](https://typescript-eslint.io/troubleshooting/typed-linting/monorepos)). **Observed:** a root config with `projectService: true, tsconfigRootDir: import.meta.dirname` type-linted both packages against their own tsconfigs.
- **Prettier:** config "will be resolved starting from the location of the file being formatted, and searching up" ([configuration](https://prettier.io/docs/configuration)), so a root `.prettierrc` covers every package. `.gitignore` is honoured "in the same directory from which it is run" ([ignore](https://prettier.io/docs/ignore)), which favours running `prettier` from the root. Not tested.

## 4. clasp per package

- **Version:** `clasp --version` prints `3.1.3` (global install under nvm Node 22.19.0). This repo has no local clasp in `devDependencies`.
- **clasp 3 vs 2:** "Clasp no longer transpiles typescript code"; use a bundler such as Rollup ([google/clasp README](https://github.com/google/clasp)). This repo already bundles first.
- **Lookup, from installed source** (`@google/clasp/build/src/core/clasp.js`):
  - Without `-P`, it calls `findUpSync('.clasp.json')` from cwd (line 218), so running from any subfolder of a package finds that package's `.clasp.json`, or the nearest ancestor's.
  - `-P/--project` accepts a file or a folder containing `.clasp.json` (lines 207-214; `clasp --help`: "path to a project file or to a folder with a '.clasp.json' file").
  - The project root is the folder holding `.clasp.json`.
  - `.claspignore` is read only from that folder or from `-I/--ignore` (lines 237-249). It is not walked up.
  - The content dir is `path.resolve(projectRoot, config.srcDir || config.rootDir || '.')` (line 154).
  - With no `.claspignore`, the defaults are `**/**`, `!**/appsscript.json`, `!**/*.gs`, `!**/*.js`, `!**/*.ts`, `!**/*.html`, `.git/**`, `node_modules/**` (lines 31-40).
- **Ignore matching** (`core/files.js` lines 39-50, 218): push crawls the content dir and applies ignore patterns with micromatch to paths relative to the content dir. The watcher matches relative to the project root (line 265). The two differ only when `rootDir` is not `""`.
- **Implication:** `packages/app/.clasp.json` (`rootDir: ""`) plus `packages/app/.claspignore` (today's `**/**`, `!appsscript.json`, `!dist/bundle.js`), and the same pattern for `packages/framework`. An npm script's cwd is the package folder (section 6), so `"build": "rollup --config && clasp push"` inside a package finds that package's `.clasp.json`. **Risk:** leaving a `.clasp.json` at the repo root means any clasp run from a package folder with no `.clasp.json` of its own silently targets the root project.
- Not run: any clasp command other than `--version`/`--help`.

## 5. `@types/google-apps-script` scoping

- **Globals belong to the program.** **Observed:**
  - App tsconfig with `types: []`: the framework source failed with `TS2503: Cannot find namespace 'GoogleAppsScript'`. The app compiles framework source, so it needs the GAS types whenever the framework uses them.
  - Adding `/// <reference types="google-apps-script" />` to framework source fixed that, and **also made `SpreadsheetApp` visible in app files** that declare no GAS types (a probe file type-checked). Triple-slash does not scope anything.
  - With no `types` field, the hoisted root `node_modules/@types/google-apps-script` was auto-included in the app program.
- **Docs:** TS < 6.0 includes all visible `@types` packages from `node_modules/@types` "of any enclosing folder" (so root-hoisted types are visible to every package). TS 6.0+ defaults `types` to `[]` ([tsconfig types](https://www.typescriptlang.org/tsconfig/#types)). TS 6.0 (2026-03-23) also defaults `rootDir` to the tsconfig's folder and `strict` to true ([TS 6.0 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/)). The repo is on 5.9 with an explicit `types: ["google-apps-script"]`, so nothing changes until an upgrade.
- **Consequence:** "only one package sees GAS globals" can hold only in the direction app-sees / framework-hides, and only if the framework never names GAS types. With the framework as the GAS-facing layer, both programs need `types: ["google-apps-script"]`. A hypothetical GAS-free package (e.g. pure Node scripts) would set `types` to exclude it.

## 6. npm workspaces behaviour

- **Script cwd (observed):** `npm run whereami` printed the root. `npm run whereami -w @ws/app` printed `packages/app`. `--workspaces` ran in each package folder in declaration order. Run inside `packages/app`, it printed `packages/app`. Docs: "Scripts are always run from the root of the package folder" ([scripts](https://docs.npmjs.com/cli/v11/using-npm/scripts)). Inside a workspace folder "the `workspace` configuration is implicitly set, and `prefix` is set to the root workspace" ([workspaces](https://docs.npmjs.com/cli/v11/using-npm/workspaces)).
- **Hoisted bins (observed):** a package script `tsc -p .` ran the root-hoisted `tsc` both from inside the package and via `-w`, with no package-local `node_modules`.
- **`--if-present` (observed):** `npm run nosuch --workspaces --if-present` exits 0. Without it, it errors per workspace. Root-level `npm run <x>` never falls through to workspaces unless `-w`/`--workspaces` is given.
- **`npm install` inside a package folder (observed):** "up to date", no nested `node_modules` and no package-level lockfile. It operates on the root.
- **Git-source installs of a subfolder:**
  - Docs list only `#<commit-ish>` and `#semver:` for git URLs ([npm install](https://docs.npmjs.com/cli/v11/commands/npm-install)).
  - `npm-package-arg` added a `::path:<dir>` committish item mapped to `gitSubdir` in 2022 ([npa#91](https://github.com/npm/npm-package-arg/pull/91)). pacote implemented `gitSubdir` in 21.2.0 on 2026-02-06 ([pacote#442](https://github.com/npm/pacote/pull/442), which closes [npm/npm#2974](https://github.com/npm/npm/issues/2974)). npm 11.10.0 bundles pacote 21.3.1 ([npm changelog](https://github.com/npm/cli/blob/latest/CHANGELOG.md)).
  - **Observed, broken end to end:**
    - npm 11.7.0 ignored `::path:` and installed the repo root under its root name.
    - npm 11.12.1 and 11.19.1 (fresh caches) read the **manifest** from the subfolder (the dependency was saved as `@ws/framework`), but **installed the whole repo root** into `node_modules/@ws/framework`, and the lockfile `resolved` URL dropped `::path:`.
    - The same happened with a hosted spec, `github:npm/cli#v11.19.1::path:workspaces/libnpmfund`: `node_modules/libnpmfund` contained npm's root `package.json`.
    - Pacote's git fetcher only appends `gitSubdir` to the temp dir it hands to its handler (`lib/git.js` lines 256, 278 in pacote 21.5.0). A similar third-party report: [anomalyco/opencode#47517](https://github.com/anomalyco/opencode/issues/47517).
  - **npm 12.0.0 (2026-07-08):** "allow-git and allow-remote now default to "none"; set them to "all" (or "root") to install git ... dependencies", and dependency lifecycle scripts are blocked unless allowed ([npm changelog](https://github.com/npm/cli/blob/latest/CHANGELOG.md)). npm 12 also requires Node `^22.22.2 || ^24.15.0 || >=26`. Local Node is 22.19.0, so npm 12 was not run.
  - The `private: true` framework in the experiment installed fine from git.

## Open uncertainties

- **Git subfolder installs.** The `::path:` breakage was reproduced on npm 11.12.1/11.19.1 only, and no npm/cli issue tracking it was found. npm 12 was untested. For outside installers, the options that avoid it are a repo (or branch/tag) whose root is the framework package, a tarball URL, or a registry publish. pnpm's own `#path:` support is outside npm and was not verified.
- **Consumer-side compilation.** An outside consumer installing framework source from git gets `.ts` under `node_modules`. Their rollup/plugin-typescript setup hits the same filter issue (section 1), and their tsconfig options check framework code. Not tested with a consumer outside the workspace.
- **ESLint major.** Moving to ESLint 10 changes config lookup to per-file. The root-config conclusion still holds, but per-package `lint` scripts behave differently between 9 and 10.
- **rollup fix variants.** Only the exact overrides above were run. `noEmitOnError`, `include` globs and an `onwarn` guard are untested alternatives.
- **Real code.** The experiment used a two-file framework. The real framework's `allowUmdGlobalAccess`, `useDefineForClassFields: false` and emit-sensitive patterns were not exercised through the app program.
