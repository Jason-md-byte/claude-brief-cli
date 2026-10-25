import { describe, expect, it } from "vitest";
import { BriefSchema, briefJsonSchema } from "../src/schema.js";
import { validBrief } from "./helpers.js";

describe("BriefSchema", () => {
  it("accepts a valid brief", () => {
    expect(BriefSchema.safeParse(validBrief).success).toBe(true);
  });

  it("rejects an empty summary", () => {
    expect(BriefSchema.safeParse({ ...validBrief, summary: "" }).success).toBe(false);
  });

  it("rejects action items without an owner", () => {
    const bad = { ...validBrief, actionItems: [{ task: "x", due: null }] };
    expect(BriefSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects wrong types", () => {
    expect(BriefSchema.safeParse({ ...validBrief, decisions: "nope" }).success).toBe(false);
  });

  it("exposes an object JSON schema without $schema", () => {
    expect(briefJsonSchema.type).toBe("object");
    expect("$schema" in briefJsonSchema).toBe(false);
  });
});
