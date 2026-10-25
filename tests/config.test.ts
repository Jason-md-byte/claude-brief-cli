import { describe, expect, it } from "vitest";
import { DEFAULT_MODEL, parseArgs, resolveApiKey, resolveModel } from "../src/config.js";
import { BriefError, ErrorCode } from "../src/errors.js";

describe("resolveApiKey", () => {
  it("returns the key", () => {
    expect(resolveApiKey({ ANTHROPIC_API_KEY: "sk-test" })).toBe("sk-test");
  });

  it("throws a clear error when missing or blank", () => {
    for (const env of [{}, { ANTHROPIC_API_KEY: "  " }]) {
      try {
        resolveApiKey(env);
        throw new Error("should throw");
      } catch (e) {
        expect(e).toBeInstanceOf(BriefError);
        expect((e as BriefError).code).toBe(ErrorCode.MissingApiKey);
        expect((e as BriefError).message).toContain("ANTHROPIC_API_KEY");
      }
    }
  });
});

describe("resolveModel", () => {
  it("prefers flag, then env, then default", () => {
    expect(resolveModel("flag", { BRIEF_MODEL: "env" })).toBe("flag");
    expect(resolveModel(undefined, { BRIEF_MODEL: "env" })).toBe("env");
    expect(resolveModel(undefined, {})).toBe(DEFAULT_MODEL);
    expect(DEFAULT_MODEL).toBe("claude-sonnet-5-5");
  });
});

describe("parseArgs", () => {
  it("parses file, format, model, output", () => {
    const r = parseArgs(["notes.md", "-f", "json", "--model", "m", "-o", "out.json"]);
    expect(r).toEqual({ kind: "run", file: "notes.md", format: "json", model: "m", output: "out.json" });
  });

  it("defaults to markdown and no file", () => {
    expect(parseArgs([])).toEqual({
      kind: "run",
      file: undefined,
      format: "markdown",
      model: undefined,
      output: undefined,
    });
  });

  it("supports help and version", () => {
    expect(parseArgs(["--help"]).kind).toBe("help");
    expect(parseArgs(["-v"]).kind).toBe("version");
  });

  it("rejects bad format", () => {
    expect(() => parseArgs(["a.md", "--format", "xml"])).toThrow(BriefError);
  });

  it("rejects unknown flags and extra positionals", () => {
    expect(() => parseArgs(["--nope"])).toThrow(BriefError);
    expect(() => parseArgs(["a.md", "b.md"])).toThrow(BriefError);
  });
});
