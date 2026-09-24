# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root, or
- **`CONTEXT-MAP.md`** at the repo root if it exists: it points at one `CONTEXT.md` per context. Read each one relevant to the topic.
- **`packages/framework/docs/design.md`**: the arguments behind the design, and this repo's substitute for an ADR tree.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The `/domain-modeling` skill (reached via `/grill-with-docs` and `/improve-codebase-architecture`) creates `CONTEXT.md` lazily when terms actually get resolved.

## File structure

This is a single-context repo, and it keeps no ADR tree:

```
/
├── CONTEXT.md                      # the app's terms
├── docs/targets-and-gates.md
├── docs/claude-code-guardrails.md
├── docs/occupancy-ledger.md
└── packages/framework/
    ├── CONTEXT.md                  # the framework's operator-facing terms
    ├── src/AGENTS.md               # the tiers
    └── docs/
        ├── design.md               # one line per principle; reasoning in design/
        ├── vocabulary.md           # architecture words; elaboration in vocabulary/
        ├── architecture.md, architecture/
        ├── generated-data.md, generated-data/
        ├── how-it-runs.md
        └── testing.md
```

## Use the glossary's vocabulary

The architecture words (Raw, Identified, Named, Meta / primary, Operator) are [`docs/vocabulary.md`](../../packages/framework/docs/vocabulary.md)'s, not the glossary's.

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal: either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## No ADR tree — flag conflicts against the framework's design.md

**Don't create `docs/adr/`.** The framework's `docs/design.md` rules it out: specs are published as GitHub issues, and a second filing system would only drift from them. An architectural argument belongs in docs/design.md's principle list, one line there plus its reasoning in `docs/design/`, cited by issue where one exists and by commit otherwise.

If your output contradicts a principle already recorded there, surface it explicitly rather than silently overriding:

> _Contradicts the framework's design.md's "Record a deliberate absence as deliberate", but worth reopening because…_
