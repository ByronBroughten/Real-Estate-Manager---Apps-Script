import eslint from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

const platformMessage =
  "Google Sheets code lives only in src/00_Source/GoogleSheets/. Everything else takes a platform-neutral type or a return value that the entry point handles.";
const rawImportPattern = {
  regex:
    "^(\\.\\./)+01_SpreadsheetSchema/(SheetSchema|ColumnSchema|columnConfigsTypes|valueConfigsTypes|generated/(columnConfigs|valueConfigs))(\\.js)?$",
  message:
    "Raw is positional: it addresses by GID and index and never resolves a column. Column and value lookups belong in the Identified tier or above.",
};
const platformImportPattern = {
  regex: "GoogleSheets/|GoogleSheets/(GoogleSheetsAPI|AppsScript)(\\.js)?$",
  message: platformMessage,
};
const tierFolders = [
  "00_Source",
  "01_SpreadsheetSchema",
  "02_SpreadsheetRaw",
  "03_SpreadsheetIdentified",
  "04_SpreadsheetNamed",
  "05_Operators",
  "06_API",
];
// The un-numbered folders built on the tiers; utils/ and testSupport/ are not among them.
const aboveTierFolders = ["businessEndpoints", "chores", "nodeHost"];
const tierImportPattern = (tier) => ({
  regex: `(^|/)(${[...tierFolders.slice(tier + 1), ...aboveTierFolders].join("|")})(/|(\\.js)?$)`,
  message: `Dependencies only point downward: ${tierFolders[tier]} imports nothing from a higher tier or from businessEndpoints, chores or nodeHost (src/AGENTS.md).`,
});
// After the platform block: a later block's no-restricted-imports replaces an earlier one's, so each merges the patterns that still apply.
const tierImportBlocks = tierFolders.flatMap((folder, tier) => {
  const extra = folder === "02_SpreadsheetRaw" ? [rawImportPattern] : [];
  const restrict = (patterns) => ({
    "no-restricted-imports": [
      "error",
      { patterns: [...patterns, tierImportPattern(tier), ...extra] },
    ],
  });
  const isPlatformFolder = folder === "00_Source";
  return [
    {
      files: [`src/${folder}/**/*.ts`],
      ignores: [
        "**/*.test.ts",
        ...(isPlatformFolder ? ["src/00_Source/GoogleSheets/**"] : []),
      ],
      rules: restrict([platformImportPattern]),
    },
    {
      files: [
        `src/${folder}/**/*.test.ts`,
        ...(isPlatformFolder ? ["src/00_Source/GoogleSheets/**/*.ts"] : []),
      ],
      rules: restrict([]),
    },
  ];
});

export default defineConfig(
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    rules: {
      "max-classes-per-file": ["error", 1],
      // `_` marks a parameter kept for its signature; a rest sibling is dropped on purpose.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", ignoreRestSiblings: true },
      ],
      // Props bags chain as interfaces, so an empty one can name a tier.
      "@typescript-eslint/no-empty-object-type": [
        "error",
        { allowInterfaces: "with-single-extends" },
      ],
      // Constants are camelCase too; methods stay free, so SHOUTING multi-row deletes pass.
      "@typescript-eslint/naming-convention": [
        "error",
        {
          selector: "variable",
          format: ["camelCase", "PascalCase"],
          leadingUnderscore: "allow",
          custom: { regex: "^[A-Z][A-Z0-9]+$", match: false },
        },
      ],
    },
  },
  {
    files: ["src/**/*.ts"],
    ignores: [
      "src/00_Source/GoogleSheets/**",
      "src/index.ts",
      "src/nodeHost/**",
      "src/chores/**",
      "src/testSupport/**",
      "src/TypeDeclarations/**",
      "**/*.test.ts",
    ],
    rules: {
      "no-restricted-imports": ["error", { patterns: [platformImportPattern] }],
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "TSQualifiedName[left.type='Identifier'][left.name='GoogleAppsScript']",
          message: platformMessage,
        },
      ],
      "no-restricted-globals": [
        "error",
        ...["SpreadsheetApp", "ScriptApp", "PropertiesService", "Sheets"].map(
          (name) => ({ name, message: platformMessage }),
        ),
      ],
    },
  },
  ...tierImportBlocks,
);
