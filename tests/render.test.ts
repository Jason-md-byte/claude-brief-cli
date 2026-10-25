import { describe, expect, it } from "vitest";
import { renderBrief } from "../src/render.js";
import { BriefSchema } from "../src/schema.js";
import { validBrief } from "./helpers.js";

const brief = BriefSchema.parse(validBrief);

describe("renderBrief", () => {
  it("renders markdown with all sections", () => {
    const md = renderBrief(brief, "markdown");
    expect(md).toContain("# Weekly sync");
    expect(md).toContain("## Summary");
    expect(md).toContain("- Launch on Nov 12");
    expect(md).toContain("- [ ] Fix payment retry bug (owner: Marcus, due: 2 days)");
    expect(md).toContain("- [ ] Book the retro (owner: Unassigned)");
    expect(md).toContain("## Open questions");
  });

  it("omits empty sections in markdown", () => {
    const md = renderBrief({ ...brief, decisions: [], openQuestions: [], actionItems: [] }, "markdown");
    expect(md).not.toContain("## Decisions");
    expect(md).not.toContain("## Action items");
    expect(md).not.toContain("## Open questions");
  });

  it("renders round-trippable JSON", () => {
    const json = renderBrief(brief, "json");
    expect(JSON.parse(json)).toEqual(brief);
  });
});
