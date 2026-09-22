# Rules for `src/businessEndpoints/`

- **Real-estate logic lives only here and in `src/businessEndpoints.ts`.** The numbered tiers stay domain-free.
- **One file per endpoint, exporting a single entry** that `src/businessEndpoints.ts` wires to its key. Classes they need go in `BusinessOperators/`.
- **A business Operator's public verbs come from [CONTEXT.md](../../CONTEXT.md).** Use the glossary's word; if it has none, raise the gap rather than invent one.
- **An endpoint that appends into its own sheet is initiated and reports from another sheet**, or its feedback stamps rows it is still creating.
- The ledger's build behavior: [`docs/occupancy-ledger.md`](../../docs/occupancy-ledger.md). Dispatch and run states: [`docs/architecture/endpoint-dispatch.md`](../../docs/architecture/endpoint-dispatch.md).
