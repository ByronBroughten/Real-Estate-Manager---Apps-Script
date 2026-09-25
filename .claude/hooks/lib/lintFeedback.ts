// Turns ESLint's JSON formatter output for one edited file into hook feedback, or nothing. Pure; lintFeedback.ts does the I/O.
interface LintFeedbackInput {
  eslintJson: string;
  filePath: string;
}

interface LintMessage {
  ruleId: string | null;
  severity: number;
  message: string;
  line: number;
  column: number;
}

const maxListed = 20;

export function lintFeedback({ eslintJson, filePath }: LintFeedbackInput): string | null {
  const errors = parseErrors(eslintJson);
  if (!errors || errors.length === 0) return null;
  const listed = errors.slice(0, maxListed).map(describe);
  const omitted = errors.length - listed.length;
  const noun = errors.length === 1 ? "error" : "errors";
  return [
    `ESLint (after --fix) left ${errors.length} ${noun} in ${filePath}:`,
    ...listed,
    ...(omitted > 0 ? [`  …and ${omitted} more; run \`npx eslint ${filePath}\`.`] : []),
  ].join("\n");
}

function describe({ line, column, ruleId, message }: LintMessage): string {
  return `  ${line}:${column} ${ruleId ?? "parse-error"} ${message}`;
}

// Anything ESLint's JSON formatter wouldn't print is unparseable, and unparseable means no feedback.
function parseErrors(eslintJson: string): LintMessage[] | null {
  try {
    const results: unknown = JSON.parse(eslintJson);
    if (!Array.isArray(results)) return null;
    return results
      .flatMap((result) => (Array.isArray(result?.messages) ? (result.messages as LintMessage[]) : []))
      .filter((message) => message.severity === 2);
  } catch {
    return null;
  }
}
