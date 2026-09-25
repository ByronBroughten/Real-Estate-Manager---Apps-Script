# @byronbroughten/config

General tooling for TypeScript projects: an ESLint flat-config preset, the prettier config and a base tsconfig. Plain JS, no build step.

| Export | Consume it with |
| --- | --- |
| `@byronbroughten/config/eslint` | `eslintPreset` spread first in `defineConfig(...)`, with project rules after it. `styleSyntax` and `variableNaming` are exported for a project block that overrides `no-restricted-syntax` or `@typescript-eslint/naming-convention`. |
| `@byronbroughten/config/prettier` | `"prettier": "@byronbroughten/config/prettier"` in `package.json`. |
| `@byronbroughten/config/tsconfig.base.json` | `"extends"` in a `tsconfig.json`, which adds its own `target`, `module` and `types`. |
