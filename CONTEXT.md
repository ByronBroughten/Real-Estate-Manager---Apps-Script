# Real Estate Manager

A Google Sheets spreadsheet that a person operates directly, with an Apps Script layer that reacts to their edits. The vocabulary below is the language of that operator-facing surface — what a person clicks, and what the sheet tells them back.

## Language

### Sheet layout

**Table**:
The Google Table (Insert > Table) laid over a sheet's data. Every sheet with **Let api access** must have exactly one, starting on the Table header row in the first column, with at least one data row (a **blank row** counts). Deleting a row above it or inserting a column to its left moves it, so the app checks where it starts on every run and refuses to go on if it has drifted, naming where the Table is and where it belongs. If a fetch finds more than one Table on a sheet with **Let api access**, it refuses the same way and names those sheets, so you can delete the extras; it never picks one for you. It never moves or rebuilds a Table, because a Table that moved or multiplied usually means you restructured the sheet on purpose.
_Avoid_: range, data range, grid

**Table reference**:
A formula that names a Table column by the Table's name and the column header — `test[Number]`, usually wrapped in `SINGLE(...)` when one cell is wanted — so the formula stays readable when columns move. It is not an A1 address like `$C5`.
_Avoid_: structured reference, A1, cell address

**Column ID row**:
The bookkeeping row of generated column identifiers, above the other two bookkeeping rows. You never edit it by hand; the app fills a blank when a Table column has none.
_Avoid_: ID row, metadata row, row 1

**Column-group heading**:
The bookkeeping row of group names, between the column ID row and the action row. You never edit it by hand.
_Avoid_: group row, section header

**Action row**:
The row above the Table header row where an endpoint is triggered. Most of its cells are empty, and a cell may hold text used as a label. Only the cells wired to an endpoint hold a checkbox, and ticking one of those is what asks the spreadsheet to do something, one endpoint per column.
_Avoid_: control row, button row, trigger row

**Table header row**:
The row of column titles you read across the top of a sheet's data, directly above the first data row, and the row the Table starts on. Three bookkeeping rows sit above it that you never edit by hand: the column ID row, the column-group heading, and the action row.
_Avoid_: header row, title row, top row, row 1

**First data row**:
The first row of the Table's data, always the row immediately below the Table header row. That index is not stored separately.
_Avoid_: data start, top data row, row 5

**Blank row**:
A data row with nothing in any of the columns you fill in yourself. It is what the app leaves when it deletes everything on a sheet: emptying the sheet completely would take the formulas, number formats, validation and colours with it, since a new row copies those from the rows already there. The formula cells still show whatever their formulas make of an empty row, so the row reads as a live row rather than a gap. The next row the app adds to that sheet goes into the blank row rather than beneath it, so it never sits stranded above your data.
_Avoid_: empty row, placeholder row, spare row

**ID prefix**:
The short code on Sheet Config that every row ID and column ID on that sheet begins with. Two sheets must not share a non-empty one; a sheet that does not mint IDs may leave it blank.
_Avoid_: sheet prefix, ID code

**Let api access**:
The Sheet Config checkbox that says this tab is one the app knows about — not every tab, and not every catalogue row on Sheet Config.
_Avoid_: enabled sheet, API sheet, known sheet

**Edit protection**:
Any protection the app finds on a sheet: an edit warning, an edit lock, or one it can't read as either, which it leaves alone.
_Avoid_: protected range (that is Google's name for the API object)

**Edit warning**:
A prompt Sheets shows anyone, the owner included, before they change a cell the app depends on; the edit still goes through if they confirm.
_Avoid_: warning (that is a run state), protection

**Edit lock**:
A cell only the editors it names can change; a lock that names none stops nobody.
_Avoid_: protection, lock

**Config-sheet floor**:
The cells on Spreadsheet Config, Sheet Config and Column Config that the app depends on and nobody edits by hand. The generated config entries for the config sheets mirror it.
_Avoid_: minimum headers, floor sheet

### Endpoints

**Endpoint**:
A unit of work the spreadsheet can be asked to do, wired to one column and triggered by a checkbox in that column's action row. Any column can be the one; it declares for itself which other columns the framework should manage on its behalf.
_Avoid_: handler, command, action

**Base endpoint**:
An endpoint the framework itself provides on Spreadsheet Config, present in every spreadsheet whatever business endpoints it adds.
_Avoid_: built-in endpoint, core endpoint, system endpoint

**Runner**:
An endpoint whose entry checkbox is a run button: ticking it starts the work, and the box clears itself immediately. An endpoint is one unless it says it also runs on unticking.
_Avoid_: job, task, trigger

**Two-way endpoint**:
An endpoint whose entry checkbox is the input rather than a button — it runs on ticking and on unticking, is told which way it went, and the box stays where the operator left it.
_Avoid_: toggle, switch

**Selector**:
A column of checkboxes an endpoint may declare, naming the rows one run is about. Ticking rows picks them out; the run then acts on those rows and reports into those rows, and leaves every other row alone. A successful run **consumes** its selection — the ticks clear themselves, the way the run button does, so an empty selector column means nothing is selected and the next run costs what it looks like it costs. A run that fails leaves the ticks alone: they are the operator's input, and the same selection can be retried once the problem is fixed. An endpoint whose selector marks a standing set of rows rather than a one-off pick declares that it **retains its selection**, and its ticks survive a successful run untouched. An endpoint whose work is about one row and could not be about two — a ledger is one page about one tenancy — declares that it **requires one row**, and a run with more than one ticked fails before it starts, saying how many you ticked, leaving every tick where it is so you can untick the extras and go again.
_Avoid_: toggle, filter

**Feedback column**:
A column an endpoint declares for the framework to write into on its behalf, rather than one the endpoint's own work fills: the start-time column and the run-status column. Each is optional; an endpoint that declares neither reports nothing.
_Avoid_: output column, status column

**Run status**:
The sentence an endpoint writes for the operator to read: that it is running, that it succeeded — in its own words if it has any — or what went wrong. It is written into the run-status cell of every row the run is about, and a run may give a particular row a sentence of its own instead.
_Avoid_: error message, log, result

**Run state**:
Which of an endpoint's four conditions its last run is in — running, success, warning or failure. A run state is always a run status message and a colour together, so the two can never disagree, and both feedback columns are painted in it, so the state is visible whichever of them an endpoint declares. Every row the run is about carries one, and a run may put a different one on a particular row.
_Avoid_: run outcome, status code

**Running**:
Work has begun and has not reported back. A run killed mid-flight stays here, which is how "died" is distinguishable from success, warning and failure alike.
_Avoid_: in progress, pending, processing

**Warning**:
The run committed its work, and something about it wants your attention — most often that some of the rows it was about went through and some did not. Its orange sits between the success green and the failure red, so the three read as a scale, and it always carries a sentence of its own, since an orange cell with nothing to say would be a puzzle.
_Avoid_: partial, incomplete, soft failure

**Run report**:
What an endpoint hands back when its work is done: nothing, a sentence, a run state with a sentence, or a set of rows that differ from the rest, each with the state and sentence it gets. Rows the report does not name take the run's own state, which is success unless the report says otherwise. A run that **fails by throwing** is a different thing: the work is abandoned, nothing is written, and every row goes red. A failure the report *names* means that one row did not go through while the rest of the run stood — the same red, because what you do about the row in front of you is the same either way.
_Avoid_: result, outcome, return value

**Start time**:
When a run began, written once into every row the run is about and never rewritten, so elapsed time stays readable while a slow run is still going.
_Avoid_: finished at, completion time, duration

### Columns

**Column type**:
What a column holds, as the operator declares it in the column's own type menu in Sheets — currency, date, checkbox, text, and the rest. The app trusts it over anything it could work out for itself from the data, including the column's number format.
_Avoid_: data type, format, value type

**Number format**:
What Format > Number says on a column's first data row — currency, date, number, plain text, and the rest. When the type menu is silent, a format the app knows counts as a declaration only if that row's value is **compatible** with it: blank, or a value the app would already guess as the name that format maps to. A value that is not compatible stays a guess, and the column stays untyped. The type menu is left alone.
_Avoid_: column type, value type, cell type, permissible

**Checkbox column**:
A column the operator made a checkbox: the type menu says Checkbox, or Insert > Checkbox put BOOLEAN data validation on the Table column or the first data row. Every one of its rows draws a box, so a row nobody has touched counts as unchecked rather than as blank, and only such a column can be an endpoint's selector. A column that merely holds TRUE and FALSE without that declaration is untyped, not a checkbox column.
_Avoid_: boolean column, tickbox column, flag column

**Empty value allowed**:
A box you tick against a column in Column Config to say that a blank in it is a real answer rather than something missing. Leave it unticked and the app stops and names the cell whenever it reads a blank there, which is what you want on a column you consider mandatory. Tick it and the app hands the blank on to whatever asked for it, and that work has to say what a missing value means. A column nobody has ticked behaves the way every column behaved before, and a newly discovered column arrives unticked, so nothing starts accepting blanks on your behalf. Your tick survives a config sync; nothing the app works out for itself will overwrite it.
_Avoid_: nullable, optional column, blank allowed

**Untyped**:
Said of a column whose type menu, checkbox validation, and first-data-row number format all tell the app nothing about what it holds — left on Automatic with no format the app maps and no Insert > Checkbox, or a dropdown that no Value Config rule backs. The app then guesses from the column's top value, and says how many such columns are left every time the config sheets sync.
_Avoid_: unset, automatic, missing type

### Units

**Unit standard name**:
A unit described by building type and bedroom count, as "Duplex-2BR". It is for comparing rents between units, not for addressing one. The unit's **name** is the address, as "730 Western, Unit 2".
_Avoid_: standard name, unit type

### The occupancy ledger

**Occupancy ledger**:
The one-page statement you hand a tenant, showing every charge they were billed, every payment that settled one, and what they still owe. It is rebuilt from scratch every time it is built, for one occupancy at a time, so nothing a previous build left behind can survive into the next one. When that occupancy names a ledger start date, the page begins that day rather than at the beginning of the tenancy. It is a printed document rather than a record: nothing else in the spreadsheet points at a line of it, and its lines carry no IDs.
_Avoid_: statement, invoice, tenant report

**Ledger start date**:
The occupancy cell that, when filled, cuts the ledger so the page begins that day. Blank means the tenancy from its beginning.
_Avoid_: from date, window start, statement date

**Ledger line**:
One row of the page: a charge billed, a charge forgiven, a payment received, a draw from the deposit, or a prior balance. It carries the day it happened, who it came from, what it was for and the amount, and the lines run in the order things happened, with a charge shown before anything that settled it the same day. A line carries no identifier, because nothing points at it.
_Avoid_: entry, row, transaction

**Prior balance**:
The collapsed history from before the ledger start date, shown as the first ledger line so Amount owed is already right that morning. Dated the start date, issued by Property management, described as "Prior balance", written as one charge — positive or negative; it is not a bill.
_Avoid_: opening balance, brought forward, carry-forward, first row

**Amount owed**:
What the household still owes as you read down the page, a running Charge minus Payment that the sheet's own formula keeps. Building a ledger never writes this column.
_Avoid_: balance due, outstanding, running total

**Letterhead**:
The block above the ledger's Table header row naming the tenant, the address and the day the page was built. Its cells are formulas, and they read the occupancy and the date that building the ledger writes into the Variable sheet. Building a ledger is what makes the letterhead say the right household.
_Avoid_: header, title block

**Issuer**:
Whose money or decision a ledger line came from. A charge or a forgiveness says "Property management"; a payment the household made says "Household" plainly rather than repeating the tenant's name down the page; a payment made on the household's behalf names the payer; and money taken from the deposit says "Security deposit", because a draw is real money settling a bill rather than the landlord paying it.
_Avoid_: source, from, party

**Forgiveness**:
A charge cancelled because it should never have stood. It appears on the ledger as a negative charge, so the page shows the charge going away rather than being paid.
_Avoid_: credit, write-off, waiver

**Security deposit draw**:
Money taken from the deposit already held to settle a charge. It appears on the ledger as a payment against the charge it settled, named after that charge.
_Avoid_: deposit deduction, withholding

**Allocation**:
One part of a payment, naming the charge that part settled. A payment split across three charges is three allocations. The ledger shows the payment rather than its allocations, so one line matches one bank transaction.
_Avoid_: split, line item, apportionment
