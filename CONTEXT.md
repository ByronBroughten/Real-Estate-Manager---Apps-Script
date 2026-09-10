# Real Estate Manager

A Google Sheets spreadsheet that a person operates directly, with an Apps Script layer that reacts to their edits. The vocabulary below is the language of that operator-facing surface — what a person clicks, and what the sheet tells them back.

## Language

### Sheet layout

**Table**:
The Google Table (Insert > Table) laid over a sheet's data. Every sheet the app knows about must have one, and it must start on the header row, in the first column. Deleting a row above it or inserting a column to its left moves it, so the app checks where it starts on every run and refuses to go on if it has drifted, naming where the Table is and where it belongs. It never moves the Table back for you, because a Table that moved usually means you restructured the sheet on purpose.
_Avoid_: range, data range, grid

**Header row**:
The row of column titles you read across the top of a sheet's data, directly above the first data row, and the row the Table starts on. Three bookkeeping rows sit above it that you never edit by hand.
_Avoid_: title row, top row, row 1

**Action row**:
The row of checkboxes above the header row. Ticking a checkbox there is what asks the spreadsheet to do something, one endpoint per column.
_Avoid_: control row, button row, trigger row

**Blank row**:
A data row with nothing in any of the columns you fill in yourself. It is what the app leaves when it deletes everything on a sheet: emptying the sheet completely would take the formulas, number formats, validation and colours with it, since a new row copies those from the rows already there. The formula cells still show whatever their formulas make of an empty row, so the row reads as a live row rather than a gap. The next row the app adds to that sheet goes into the blank row rather than beneath it, so it never sits stranded above your data.
_Avoid_: empty row, placeholder row, spare row

### Endpoints

**Endpoint**:
A unit of work the spreadsheet can be asked to do, wired to one column and triggered by a checkbox in that column's action row. Any column can be the one; it declares for itself which other columns the framework should manage on its behalf.
_Avoid_: handler, command, action

**Runner**:
An endpoint whose entry checkbox is a run button: ticking it starts the work, and the box clears itself immediately. An endpoint is one unless it says it also runs on unticking.
_Avoid_: job, task, trigger

**Two-way endpoint**:
An endpoint whose entry checkbox is the input rather than a button — it runs on ticking and on unticking, is told which way it went, and the box stays where the operator left it.
_Avoid_: toggle, switch

**Selector**:
A column of checkboxes an endpoint may declare, naming the rows one run is about. Ticking rows picks them out; the run then acts on those rows and reports into those rows, and leaves every other row alone. A successful run **consumes** its selection — the ticks clear themselves, the way the run button does, so an empty selector column means nothing is selected and the next run costs what it looks like it costs. A run that fails leaves the ticks alone: they are the operator's input, and the same selection can be retried once the problem is fixed. An endpoint whose selector marks a standing set of rows rather than a one-off pick declares that it **retains its selection**, and its ticks survive a successful run untouched.
_Avoid_: toggle, filter

**Feedback column**:
A column an endpoint declares for the framework to write into on its behalf, rather than one the endpoint's own work fills: the start-time column and the run-status column. Each is optional; an endpoint that declares neither reports nothing.
_Avoid_: output column, status column

**Run status**:
The sentence an endpoint writes for the operator to read: that it is running, that it succeeded — in its own words if it has any — or what went wrong. It is written into the run-status cell of every row the run is about.
_Avoid_: error message, log, result

**Run state**:
Which of an endpoint's three conditions its last run is in — running, succeeded, or failed. A run state is always a run status message and a colour together, so the two can never disagree.
_Avoid_: run outcome, status code

**Running**:
Work has begun and has not reported back. A run killed mid-flight stays here, which is how "died" is distinguishable from both "succeeded" and "failed".
_Avoid_: in progress, pending, processing

**Start time**:
When a run began, written once into every row the run is about and never rewritten, so elapsed time stays readable while a slow run is still going.
_Avoid_: finished at, completion time, duration

### Columns

**Column type**:
What a column holds, as the operator declares it in the column's own type menu in Sheets — currency, date, checkbox, text, and the rest. The app trusts it over anything it could work out for itself from the data.
_Avoid_: data type, format, value type

**Untyped**:
Said of a column whose type menu tells the app nothing about what it holds — left on Automatic, or a dropdown that no Value Config rule backs. The app then guesses from the column's top row, and says how many such columns are left every time the config sheets sync.
_Avoid_: unset, automatic, missing type
