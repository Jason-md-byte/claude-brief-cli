import type Anthropic from "@anthropic-ai/sdk";

export const validBrief = {
  title: "Weekly sync",
  summary: "Launch slipped to Nov 12.",
  decisions: ["Launch on Nov 12", "No contractor this quarter"],
  actionItems: [
    { task: "Fix payment retry bug", owner: "Marcus", due: "2 days" },
    { task: "Book the retro", owner: "Unassigned", due: null },
  ],
  openQuestions: ["Who tells customers about the delay?"],
};

export function toolUseMessage(input: unknown, name = "submit_brief"): Anthropic.Message {
  return {
    id: "msg_1",
    type: "message",
    role: "assistant",
    model: "claude-sonnet-5-5",
    content: [{ type: "tool_use", id: "tu_1", name, input }],
    stop_reason: "tool_use",
    stop_sequence: null,
    usage: { input_tokens: 1, output_tokens: 1 },
  } as unknown as Anthropic.Message;
}

export function textMessage(text: string, stopReason = "end_turn"): Anthropic.Message {
  return {
    id: "msg_2",
    type: "message",
    role: "assistant",
    model: "claude-sonnet-5-5",
    content: [{ type: "text", text }],
    stop_reason: stopReason,
    stop_sequence: null,
    usage: { input_tokens: 1, output_tokens: 1 },
  } as unknown as Anthropic.Message;
}
