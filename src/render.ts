import type { Brief } from "./schema.js";

export const OutputFormat = {
  Markdown: "markdown",
  Json: "json",
} as const;

export type OutputFormat = (typeof OutputFormat)[keyof typeof OutputFormat];

function section(heading: string, lines: readonly string[]): string[] {
  return lines.length === 0 ? [] : [`## ${heading}`, "", ...lines, ""];
}

function renderMarkdown(brief: Brief): string {
  const decisions = brief.decisions.map((d) => `- ${d}`);
  const actions = brief.actionItems.map((a) => {
    const meta = [`owner: ${a.owner}`, ...(a.due === null ? [] : [`due: ${a.due}`])].join(", ");
    return `- [ ] ${a.task} (${meta})`;
  });
  const questions = brief.openQuestions.map((q) => `- ${q}`);

  return [
    `# ${brief.title}`,
    "",
    ...section("Summary", [brief.summary]),
    ...section("Decisions", decisions),
    ...section("Action items", actions),
    ...section("Open questions", questions),
  ]
    .join("\n")
    .trimEnd()
    .concat("\n");
}

export function renderBrief(brief: Brief, format: OutputFormat): string {
  return format === OutputFormat.Json ? `${JSON.stringify(brief, null, 2)}\n` : renderMarkdown(brief);
}
