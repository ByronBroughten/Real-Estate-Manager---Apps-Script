# Rules for `src/businessEndpoints/`

- **Real-estate logic lives only here and in `src/businessEndpoints.ts`.** The numbered tiers stay domain-free.
- **One file per endpoint, exporting a single entry** that `src/businessEndpoints.ts` wires to its key. Classes they need go in `BusinessOperators/`.
- **A business Operator's public verbs come from [CONTEXT.md](../../CONTEXT.md).** Use the glossary's word; if it has none, raise the gap rather than invent one.
- Dispatch and run states: [`docs/architecture/endpoint-dispatch.md`](../../docs/architecture/endpoint-dispatch.md).
