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
const appConfigsImportPattern = {
  regex: "(^|/)generated/|(^|/)appConfigs(\\.js)?$",
  message:
    "Tiers take config types from Register and values from installedConfigs(); only src/appConfigs.ts imports the generated configs.",
};
const platformImportPattern = {
  regex: "GoogleSheets/|GoogleSheets/(GoogleSheetsAPI|AppsScript)(\\.js)?$",
  message: platformMessage,
};
// utils/ sits below every numbered tier.
const layerFolders = [
  "utils",
  "00_Source",
  "01_SpreadsheetSchema",
  "02_SpreadsheetRaw",
  "03_SpreadsheetIdentified",
  "04_SpreadsheetNamed",
  "05_Operators",
  "06_API",
];
// The un-numbered folders built on the tiers; utils/ and testSupport/ are not among them.
const aboveTierFolders = [
  "appsScriptHost",
  "appUtils",
  "businessEndpoints",
  "chores",
  "framework",
  "frameworkTesting",
  "nodeHost",
];
const layerImportPattern = (layer) => ({
  regex: `(^|/)(${[...layerFolders.slice(layer + 1), ...aboveTierFolders].join("|")})(/|(\\.js)?$)`,
  message: `Dependencies only point downward: ${layerFolders[layer]} imports nothing from a higher tier or from ${aboveTierFolders.join(", ")} (src/AGENTS.md).`,
});
// After the platform block: a later block's no-restricted-imports replaces an earlier one's, so each merges the patterns that still apply.
const layerImportBlocks = layerFolders.flatMap((folder, layer) => {
  const extra = folder === "02_SpreadsheetRaw" ? [rawImportPattern] : [];
  const restrict = (patterns) => ({
    "no-restricted-imports": [
      "error",
      { patterns: [...patterns, layerImportPattern(layer), ...extra] },
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
      rules: restrict([platformImportPattern, appConfigsImportPattern]),
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

// App code reaches the framework only through its package name; in place, relative paths are whitelisted to the app's own files.
const frameworkPackage = "@byronbroughten/sheets-framework";
const appRootNames = [
  "index",
  "appConfigs",
  "installAppConfigs",
  "businessEndpoints",
  "appUtils",
  "01_SpreadsheetSchema/generated",
];
const appFolders = ["businessEndpoints", "appUtils"];
const appTestSetupFiles = ["src/installAppConfigs.ts"];
const appEntryMessage = `App code imports the framework only from "${frameworkPackage}", and "${frameworkPackage}/testing" only from *.test.ts (#140).`;
const appImportPatterns = (depth, allowTesting) => {
  const toSrcRoot = depth === 0 ? "\\./" : `(\\.\\./){${depth}}`;
  return [
    {
      regex: `^(\\.\\./){${depth + 1}}`,
      message: "A relative import stays inside the app (#140).",
    },
    {
      regex: `^${toSrcRoot}(?!\\.\\./|(${appRootNames.join("|")})(/|(\\.js)?$))`,
      message: appEntryMessage,
    },
    {
      regex: `^${frameworkPackage}/${allowTesting ? "(?!testing$)" : ""}`,
      message: appEntryMessage,
    },
  ];
};
const appFileGlobsByDepth = [
  ["src/index.ts", "src/appConfigs.ts", "src/businessEndpoints.ts"],
  ...[1, 2, 3].map((depth) =>
    appFolders.map((folder) => `src/${folder}/${"*/".repeat(depth - 1)}*.ts`),
  ),
];
const appImportBlocks = appFileGlobsByDepth.flatMap((globs, depth) => [
  {
    files: globs,
    ignores: ["**/*.test.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: appImportPatterns(depth, false) },
      ],
    },
  },
  {
    files: [
      ...(depth === 0
        ? appTestSetupFiles
        : globs.map((glob) => [glob, "**/*.test.ts"])),
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: appImportPatterns(depth, true) },
      ],
    },
  },
]);

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
      "src/appsScriptHost/**",
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
  ...layerImportBlocks,
  ...appImportBlocks,
);
