// PROTOTYPE #114, throwaway: the framework's own dev-spreadsheet configs, no real-estate names.
export const sheetConfigs = {
  widget: { sheetGid: 11, idPrefix: "wdg" },
  gadget: { sheetGid: 22, idPrefix: "gdg" },
} as const;

export const columnConfigs = {
  widget: {
    name: { header: "Name", valueName: "string" },
    count: { header: "Count", valueName: "number" },
    run: { header: "Run", valueName: "checkbox" },
  },
  gadget: {
    label: { header: "Label", valueName: "string" },
  },
} as const;
