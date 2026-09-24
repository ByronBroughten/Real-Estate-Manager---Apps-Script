# Real Estate Manager

A Google Sheets spreadsheet that a person operates directly, with an Apps Script layer that reacts to their edits. The vocabulary below is the language of that operator-facing surface — what a person clicks, and what the sheet tells them back.

The sheet layout, endpoint and column words every app built on the framework shares are the framework's glossary, [`packages/framework/CONTEXT.md`](./packages/framework/CONTEXT.md). The terms below are this app's own.

## Language

### Units

**Unit standard name**:
A unit described by building type and bedroom count, as "Duplex-2BR". It is for comparing rents between units, not for addressing one. The unit's **name** is the address, as "730 Western, Unit 2".
_Avoid_: standard name, unit type

### The occupancy ledger

**Occupancy ledger**:
The one-page statement you hand a tenant about one occupancy, showing every charge they were billed, every payment that settled one, and what they still owe. It is a printed document rather than a record: nothing else in the spreadsheet points at a line of it. How it is built: [`docs/occupancy-ledger.md`](./docs/occupancy-ledger.md).
_Avoid_: statement, invoice, tenant report

**Ledger start date**:
The occupancy cell that, when filled, cuts the ledger so the page begins that day. Blank means the tenancy from its beginning.
_Avoid_: from date, window start, statement date

**Ledger line**:
One row of the page: a charge billed, a charge forgiven, a payment received, a draw from the deposit, or a prior balance. It carries the day it happened, its **issuer**, what it was for and the amount, and no identifier.
_Avoid_: entry, row, transaction

**Prior balance**:
The collapsed history from before the ledger start date, shown as the first ledger line so Amount owed is already right that morning. It is written as one charge, positive or negative, and is not a bill.
_Avoid_: opening balance, brought forward, carry-forward, first row

**Amount owed**:
What the household still owes as you read down the page, a running Charge minus Payment that the sheet's own formula keeps.
_Avoid_: balance due, outstanding, running total

**Letterhead**:
The block above the ledger's Table header row naming the tenant, the address and the day the page was built.
_Avoid_: header, title block

**Issuer**:
Whose money or decision a ledger line came from: Property management, the Household, a named payer on the household's behalf, or the Security deposit.
_Avoid_: source, from, party

**Forgiveness**:
A charge cancelled because it should never have stood. It appears on the ledger as a negative charge, so the page shows the charge going away rather than being paid.
_Avoid_: credit, write-off, waiver

**Security deposit draw**:
Money taken from the deposit already held to settle a charge. It appears on the ledger as a payment against the charge it settled.
_Avoid_: deposit deduction, withholding

**Allocation**:
One part of a payment, naming the charge that part settled. A payment split across three charges is three allocations; the ledger shows the payment, not its allocations.
_Avoid_: split, line item, apportionment
