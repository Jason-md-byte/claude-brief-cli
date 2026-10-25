import { z } from "zod";

export const ActionItemSchema = z.object({
  task: z.string().min(1).describe("What needs to be done, as a short imperative sentence."),
  owner: z
    .string()
    .min(1)
    .describe('Person responsible. Use "Unassigned" when the notes do not say.'),
  due: z.string().nullable().describe("Deadline exactly as stated in the notes, or null if none."),
});

export const BriefSchema = z.object({
  title: z.string().min(1).describe("Short descriptive title for the document."),
  summary: z.string().min(1).describe("2-4 sentence summary of what the document is about."),
  decisions: z.array(z.string().min(1)).describe("Decisions that were actually made."),
  actionItems: z.array(ActionItemSchema).describe("Concrete follow-up tasks."),
  openQuestions: z.array(z.string().min(1)).describe("Unresolved questions or unclear ownership."),
});

export type ActionItem = z.infer<typeof ActionItemSchema>;
export type Brief = z.infer<typeof BriefSchema>;

function buildJsonSchema(): Record<string, unknown> {
  const schema = { ...z.toJSONSchema(BriefSchema) } as Record<string, unknown>;
  delete schema["$schema"];
  return schema;
}

/** JSON Schema handed to the model as the tool's `input_schema`. Generated from the zod schema. */
export const briefJsonSchema = buildJsonSchema() as { type: "object" } & Record<string, unknown>;
