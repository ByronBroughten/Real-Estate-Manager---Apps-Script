# Real Estate Manager

A Google Sheets spreadsheet that a person operates directly, with an Apps Script layer that reacts to their edits. The vocabulary below is the language of that operator-facing surface — what a person clicks, and what the sheet tells them back.

## Language

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
A column of checkboxes an endpoint may declare, naming the rows one run is about. Ticking rows picks them out; the run then acts on those rows and reports into those rows, and leaves every other row alone.
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
