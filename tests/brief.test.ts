import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";
import { generateBrief, type BriefClient } from "../src/brief.js";
import { BriefError, ErrorCode } from "../src/errors.js";
import { textMessage, toolUseMessage, validBrief } from "./helpers.js";

function clientReturning(result: Promise<Anthropic.Message>) {
  const create = vi.fn<BriefClient["messages"]["create"]>(() => result);
  const client: BriefClient = { messages: { create } };
  return { client, create };
}

async function rejection(promise: Promise<unknown>): Promise<BriefError> {
  try {
    await promise;
  } catch (e) {
    if (e instanceof BriefError) return e;
    throw e;
  }
  throw new Error("expected rejection");
}

describe("generateBrief", () => {
  it("returns a validated brief and forces the tool", async () => {
    const { client, create } = clientReturning(Promise.resolve(toolUseMessage(validBrief)));
    const brief = await generateBrief(client, { text: "notes", model: "m-1" });
    expect(brief.title).toBe("Weekly sync");
    const params = create.mock.calls[0]?.[0];
    expect(params?.model).toBe("m-1");
    expect(params?.tool_choice).toEqual({ type: "tool", name: "submit_brief" });
    expect(JSON.stringify(params?.messages)).toContain("notes");
  });

  it("rejects empty and whitespace-only input without calling the API", async () => {
    const { client, create } = clientReturning(Promise.resolve(toolUseMessage(validBrief)));
    const err = await rejection(generateBrief(client, { text: "  \n\t ", model: "m" }));
    expect(err.code).toBe(ErrorCode.EmptyInput);
    expect(create).not.toHaveBeenCalled();
  });

  it("rejects oversized input", async () => {
    const { client } = clientReturning(Promise.resolve(toolUseMessage(validBrief)));
    const err = await rejection(generateBrief(client, { text: "a".repeat(600_000), model: "m" }));
    expect(err.code).toBe(ErrorCode.InputTooLarge);
  });

  it("errors when the model returns no tool call", async () => {
    const { client } = clientReturning(Promise.resolve(textMessage("sorry")));
    const err = await rejection(generateBrief(client, { text: "x", model: "m" }));
    expect(err.code).toBe(ErrorCode.InvalidModelOutput);
  });

  it("mentions truncation when stop_reason is max_tokens", async () => {
    const { client } = clientReturning(Promise.resolve(textMessage("", "max_tokens")));
    const err = await rejection(generateBrief(client, { text: "x", model: "m" }));
    expect(err.message).toMatch(/truncated/i);
  });

  it("errors when output fails zod validation", async () => {
    const { client } = clientReturning(Promise.resolve(toolUseMessage({ title: "x" })));
    const err = await rejection(generateBrief(client, { text: "x", model: "m" }));
    expect(err.code).toBe(ErrorCode.InvalidModelOutput);
    expect(err.message).toContain("summary");
  });

  it("maps authentication errors", async () => {
    const e = new Anthropic.AuthenticationError(401, undefined, "bad key", new Headers());
    const { client } = clientReturning(Promise.reject(e));
    const err = await rejection(generateBrief(client, { text: "x", model: "m" }));
    expect(err.code).toBe(ErrorCode.Auth);
  });

  it("maps rate limit errors", async () => {
    const e = new Anthropic.RateLimitError(429, undefined, "slow down", new Headers());
    const { client } = clientReturning(Promise.reject(e));
    const err = await rejection(generateBrief(client, { text: "x", model: "m" }));
    expect(err.code).toBe(ErrorCode.RateLimit);
  });

  it("maps not found (bad model) errors", async () => {
    const e = new Anthropic.NotFoundError(404, undefined, "model: nope", new Headers());
    const { client } = clientReturning(Promise.reject(e));
    const err = await rejection(generateBrief(client, { text: "x", model: "nope" }));
    expect(err.code).toBe(ErrorCode.Api);
    expect(err.message).toContain("nope");
  });

  it("maps other API errors with status", async () => {
    const e = new Anthropic.InternalServerError(500, undefined, "boom", new Headers());
    const { client } = clientReturning(Promise.reject(e));
    const err = await rejection(generateBrief(client, { text: "x", model: "m" }));
    expect(err.code).toBe(ErrorCode.Api);
    expect(err.message).toContain("500");
  });

  it("maps connection errors", async () => {
    const e = new Anthropic.APIConnectionError({ message: "offline" });
    const { client } = clientReturning(Promise.reject(e));
    const err = await rejection(generateBrief(client, { text: "x", model: "m" }));
    expect(err.code).toBe(ErrorCode.Network);
  });

  it("wraps unknown errors", async () => {
    const { client } = clientReturning(Promise.reject(new Error("weird")));
    const err = await rejection(generateBrief(client, { text: "x", model: "m" }));
    expect(err.code).toBe(ErrorCode.Unknown);
    expect(err.message).toContain("weird");
  });
});
