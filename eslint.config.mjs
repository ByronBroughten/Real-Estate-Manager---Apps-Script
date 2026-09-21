import eslint from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

const platformMessage =
  "Google Sheets code lives only in src/00_Source/GoogleSheets/. Everything else takes a platform-neutral type or a return value that the entry point handles.";
// Leaks still being moved behind the platform module (#104).
const platformLeaks = [
  "src/02_SpreadsheetRaw/ClassBases/SpreadsheetBaseRaw.ts",
  "src/02_SpreadsheetRaw/SpreadsheetRaw.ts",
  "src/06_API/Api.ts",
];
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
      ...platformLeaks,
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
  // After the platform block: a later block's no-restricted-imports replaces an earlier one's.
  {
    files: ["src/02_SpreadsheetRaw/**/*.ts"],
    ignores: platformLeaks,
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [platformImportPattern, rawImportPattern] },
      ],
    },
  },
  {
    files: platformLeaks.filter((file) => file.startsWith("src/02_")),
    rules: {
      "no-restricted-imports": ["error", { patterns: [rawImportPattern] }],
    },
  },
);
