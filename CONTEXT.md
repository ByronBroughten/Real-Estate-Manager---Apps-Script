# Real Estate Manager

A Google Sheets spreadsheet that a person operates directly, with an Apps Script layer that reacts to their edits. The vocabulary below is the language of that operator-facing surface — what a person clicks, and what the sheet tells them back.

## Language

### Endpoints

**Endpoint**:
A unit of work the spreadsheet can be asked to do, wired to one column and triggered by a checkbox in that column's action row.
_Avoid_: handler, command, action

**Runner**:
An endpoint whose checkbox is a run button: ticking it starts the work, and the box clears itself immediately.
_Avoid_: job, task, trigger

**Selector**:
An endpoint whose checkbox is the input rather than a button — it runs on both tick and untick, and is told which way it went.
_Avoid_: toggle, filter

**Stem**:
The shared prefix that identifies one runner across its columns. Two columns with the same stem belong to the same runner; two runners never share a stem.
_Avoid_: prefix, family, group

**Run status**:
The sentence a runner writes for the operator to read: that it is running, that it succeeded, or what went wrong.
_Avoid_: error message, log, result

**Run state**:
Which of a runner's three conditions its last run is in — running, succeeded, or failed. A run state is always a run status message and a colour together, so the two can never disagree.
_Avoid_: run outcome, status code

**Running**:
Work has begun and has not reported back. A run killed mid-flight stays here, which is how "died" is distinguishable from both "succeeded" and "failed".
_Avoid_: in progress, pending, processing

**Start time**:
When a run began, written once when it begins and never rewritten, so elapsed time stays readable while a slow run is still going.
_Avoid_: finished at, completion time, duration
