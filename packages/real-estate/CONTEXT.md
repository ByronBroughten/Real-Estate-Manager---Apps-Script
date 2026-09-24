# Real Estate Manager

**Read the framework's glossary first: [`../framework/CONTEXT.md`](../framework/CONTEXT.md).** Its sheet layout, endpoint and column words hold here unchanged. The terms below are this app's own; where one leans on a framework term it links to it rather than redefining it.

A Google Sheets spreadsheet for managing rental properties that a person operates directly, with an Apps Script layer built on the framework reacting to their edits. The vocabulary below is the language of that operator-facing surface — what a person clicks, and what the sheet tells them back.

## Language

### Units

**Unit standard name**:
A unit described by building type and bedroom count, as "Duplex-2BR". It is for comparing rents between units, not for addressing one. The unit's **name** is the address, as "730 Western, Unit 2", and sits in the unit sheet's [Name column](../framework/CONTEXT.md#columns).
_Avoid_: standard name, unit type

### The occupancy ledger

**Occupancy ledger**:
The one-page statement you hand a tenant about one occupancy, showing every charge they were billed, every payment that settled one, and what they still owe. It is a printed document rather than a record: nothing else in the spreadsheet points at a line of it. Making one is **building** it, which an [endpoint](../framework/CONTEXT.md#endpoints) does. How it is built: [`docs/occupancy-ledger.md`](./docs/occupancy-ledger.md).
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
The block above the ledger's [Table header row](../framework/CONTEXT.md#sheet-layout) naming the tenant, the address and the day the page was built.
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

## Same word, two meanings

- **Name**: a unit's name is its address, and it lives in the framework's **Name column**. A **unit standard name** is not a name in that sense: no endpoint finds a row by it.
- **Header**: the framework's **Table header row** is the row of column titles; the **letterhead** is the block above it. Say which; never "header" alone.
- **Row** and **line**: a **ledger line** is one data row of the ledger's Table. Say "ledger line" for what the tenant reads and "row" only for the sheet mechanics; the **prior balance** sits in the **first data row** but is named for what it says, not where it sits.
- **Start**: a run's **start time** is when an endpoint began; the **ledger start date** is the day the page begins. Neither stands in for the other.
- **Operator**: the person working the spreadsheet. `OccupancyLedgerOperator` is an Operator in the architecture sense ([vocabulary](../framework/docs/vocabulary.md)), a class, not a person.
