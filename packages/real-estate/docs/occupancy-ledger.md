# Building an occupancy ledger

How the occupancy ledger is built, beyond [`CONTEXT.md`](../CONTEXT.md)'s definitions of its words. The endpoint is `src/businessEndpoints/buildLedger.ts`, behind `OccupancyLedgerOperator`.

A build rebuilds the page from scratch for one occupancy, writes the letterhead's inputs, and never writes Amount owed or a line ID.

## Rebuilt from scratch, one occupancy at a time

It is rebuilt from scratch every time it is built, for one occupancy at a time, so nothing a previous build left behind can survive into the next one. Its lines carry no IDs, because nothing points at them.

## The ledger start date cuts the page

When that occupancy names a ledger start date, the page begins that day rather than at the beginning of the tenancy. The **prior balance** is dated the start date, issued by Property management, described as "Prior balance", and written as one charge, positive or negative.

## Line order

The lines run in the order things happened, with a charge shown before anything that settled it the same day.

## Amount owed and the letterhead are formulas

Building a ledger never writes the Amount owed column. The letterhead's cells are formulas, and they read the occupancy and the date that building the ledger writes into the Variable sheet. Building a ledger is what makes the letterhead say the right household.

## Who each line's issuer is

A charge or a forgiveness says "Property management"; a payment the household made says "Household" plainly rather than repeating the tenant's name down the page; a payment made on the household's behalf names the payer; and money taken from the deposit says "Security deposit", because a draw is real money settling a bill rather than the landlord paying it. A **security deposit draw** is named after the charge it settled.

## One line per bank transaction

The ledger shows a payment rather than its allocations, so one line matches one bank transaction.
