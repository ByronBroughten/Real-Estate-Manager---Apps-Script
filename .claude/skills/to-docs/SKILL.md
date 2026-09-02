---
name: to-docs
description: "Turn the session's friction into proposed updates to README.md / STYLE.md / CLAUDE.md: what the docs failed to tell you, not what you decided."
disable-model-invocation: true
---

Mine the session for **friction** — every place the project's own docs cost you time — and propose the edits that would spare the next session.

The spine test, applied to every candidate:

> **Propose only what a doc could have told you before the session started.**

That test is the whole skill. What you *decided* this session belongs in a spec, an issue, or a commit message. What you had to *find out* belongs in the docs. A retro that restates conclusions has failed even if every line is true.

## 1. Hunt the friction

Go back through the session and name every instance of three kinds. Be relentless: the easy two will surface on their own, and stopping there is the failure mode.

- **Misdirection** — a doc line you read and acted on that pointed wrong. Usually not false: stale, or written in a tense that implies a live defect where the code already handles it, or precise about a mechanism and silent about whether it currently bites.
- **Rediscovery** — a fact you derived by reading source, probing, or measuring. Measurements are the richest kind, because they cannot be looked up at all.
- **Stated rule** — a preference or rule the user articulated in conversation that no doc holds. These are the ones you will miss. Scan the user's own turns for the sentences that begin "I prefer", "as a general rule", "always", or that correct an approach you proposed.

**Include your own wrong turns, and weight them heavily.** A confident claim you had to retract is the strongest possible signal: something about this codebase invites that specific error, and a doc line can disarm it for everyone after you. Under-reporting these is the default; resist it.

Done when every wrong turn, rediscovered fact, and user-stated rule in the session is either carried to step 2 or dismissed with a stated reason.

## 2. Keep what passes all four tests

- **Beforehand** — could a doc have stated this before the session began? (Conclusions, decisions, and summaries fail here.)
- **Ownership** — is it already assigned to a spec, issue, or PR from this session? Leave it there and say so; do not write it twice.
- **Lookup** — can the next agent find it with one file read or one command? Leave it to the environment, where it cannot go stale. Cache only what cannot be found by looking: the unwritten convention, the reason behind a choice, the measurement, the gotcha no config confesses.
- **Durability** — will it still be true in three months? Counts and tallies of generated data go stale; the invariant behind them does not.

## 3. Route and rank

- **README.md** — architecture, measured costs, invariants, naming vocabulary.
- **STYLE.md** — code shape. Its charter is rules distilled from the user's own refactors, so a **stated rule** almost always lands here.
- **CLAUDE.md** — loaded every turn, so it earns a line only if that line changes turn-one behavior. Everything else goes in the other two with a pointer at most.

Rank by time the change would have saved this session, and say so. A ranked list lets the user take the top three and stop.

## 4. Present, then wait

Give the proposal with, for each item: the friction it came from, the file, and the wording you'd add. Concrete wording, not a description of wording — the user is approving the edit, not the idea.

Then stop. Do not edit until the user approves.

## 5. On approval

Write the edits, then `npx prettier --check` the touched files. Commit on a branch of its own: this fires at the end of a session, so other work is usually in flight and a docs-only commit should not ride along with it.
