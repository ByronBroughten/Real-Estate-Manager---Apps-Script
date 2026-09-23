# Functional vs. imperative idioms: examples

Disclosed from [`docs/style.md`](../style.md), "Functional vs. imperative idioms". The rules are there, one line each; this file holds the examples.

## `reduce` builds a new object

`reduce` builds a new object or record through an accumulator, `(acc, item) => ({ ...acc, ... })`, in place of a manual loop with a declared accumulator.

## Mutators return `this`

A mutator method returns `this` so calls chain: `fetchAndUpdateAll(): this { ...; return this; }`.

## A combined option is built from its parts

`prepFetchRowSpecifier`'s `"all"` case calls itself for `"headers"`, `"actions"`, `"columnIds"` and `"data"` rather than repeating their bodies.

## State is a named flag, not a trick

`lazy` tracks "already computed" with `let ready = false` and `if (!ready) { value = make(); ready = true; }`. It doesn't use `made ??= { value: make() }`, which needs a box to tell "computed as `undefined`" from "not computed" and hides that reason. The flag version is a few lines longer, but a reader doesn't have to derive why it's shaped that way.
