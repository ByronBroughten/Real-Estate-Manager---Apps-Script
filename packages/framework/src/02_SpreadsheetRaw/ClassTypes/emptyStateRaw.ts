import type {
  RowChangesToSave,
  SheetChangesToSave,
  SheetFetchQueueRaw,
  SheetStateRaw,
  SheetWorkingStateRaw,
  SheetWriteQueueRaw,
  SpreadsheetFetchQueueRaw,
  SpreadsheetWriteQueueRaw,
  UpdateRequests,
} from "./StateRaw";

export const emptyStateRaw = {
  updateRequests(): UpdateRequests {
    return {
      addSheet: [],
      addTable: [],
      append: [],
      update: [],
      delete: [],
      sort: [],
      insertColumn: [],
      fill: [],
      findReplace: [],
      deleteConditionalFormat: [],
      addConditionalFormat: [],
      deleteProtectedRange: [],
      addProtectedRange: [],
      updateSheetTitle: [],
      updateTableName: [],
      updateTableColumnType: [],
      updateTableColumnProperties: [],
      addCheckboxValidation: [],
      raw: [],
    };
  },
  spreadsheetFetchQueue(): SpreadsheetFetchQueueRaw {
    return { gridRanges: [] };
  },
  spreadsheetWriteQueue(): SpreadsheetWriteQueueRaw {
    return { updateRequests: emptyStateRaw.updateRequests() };
  },
  sheetChanges(): SheetChangesToSave {
    return { sort: null, insertColumn: [], fills: [] };
  },
  rowChanges(): RowChangesToSave {
    return { append: false, delete: false, update: new Map() };
  },
  sheetWriteQueue(): SheetWriteQueueRaw {
    return {
      sheet: emptyStateRaw.sheetChanges(),
      rows: new Map(),
      reservedRowIndexes: new Set(),
    };
  },
  sheetState(): SheetStateRaw {
    return {
      working: emptySheetWorkingState(),
      fetchQueue: emptySheetFetchQueue(),
      writeQueue: emptyStateRaw.sheetWriteQueue(),
    };
  },
};

function emptySheetFetchQueue(): SheetFetchQueueRaw {
  return {
    gatherConditionalFormats: false,
    gatherEditProtections: false,
    toFinalize: {
      rows: new Set(),
      columns: new Set(),
      cells: new Map(),
    },
  };
}

function emptySheetWorkingState(): SheetWorkingStateRaw {
  return {
    title: null,
    knownTable: null,
    tables: [],
    hasExtraTables: false,
    cellStateIsStale: false,
    hasFetchedColumnIds: false,
    isPrunedToSelection: false,
    rowStates: new Map(),
    columnStates: new Map(),
    conditionalFormats: { rules: null, isStale: false },
    editProtections: { protections: null, isStale: false },
  };
}
