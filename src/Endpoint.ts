import { SpreadsheetNamedBase } from "./3. SpreadsheetNamed/ClassBases/SpreadsheetNamedBase";

// SheetRaw: reduceActiveRows()
// add row ids to get option
// make sure added rows only add ones that are missing and update columns otherwise
export class Endpoint extends SpreadsheetNamedBase {
  // Each business service will:
  // - inherit SpreadsheetNamedBase
  // - I'll handle endpoints one at a time. We'll see if we need this class or not.
  // - Endpoint would have endpointName; SelectorEndpoint would have that and selectorName.
  //   - Both names would be sheetName:columnName
}
