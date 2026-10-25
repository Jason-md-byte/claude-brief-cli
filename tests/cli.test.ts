import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";
import type { BriefClient } from "../src/brief.js";
import { run, type CliDeps } from "../src/cli.js";
import { toolUseMessage, validBrief } from "./helpers.js";

function makeDeps(overrides: Partial<CliDeps> = {}) {
  const out: string[] = [];
  const err: string[] = [];
  const create = vi.fn<BriefClient["messages"]["create"]>(() =>
    Promise.resolve(toolUseMessage(validBrief)),
  );
  const createClient = vi.fn<CliDeps["createClient"]>(() => ({ messages: { create } }));
  const writeFile = vi.fn<CliDeps["writeFile"]>(() => Promise.resolve());
  const deps: CliDeps = {
    env: { ANTHROPIC_API_KEY: "sk-test" },
    readFile: () => Promise.resolve("some notes"),
    readStdin: () => Promise.resolve("stdin notes"),
    writeFile,
    stdinIsTTY: true,
    stdout: (s) => out.push(s),
    stderr: (s) => err.push(s),
    createClient,
    ...overrides,
  };
  return { deps, out, err, create, createClient, writeFile };
}

describe("cli run", () => {
  it("prints markdown for a file and exits 0", async () => {
    const { deps, out } = makeDeps();
    expect(await run(["notes.md"], deps)).toBe(0);
    expect(out.join("")).toContain("# Weekly sync");
  });

  it("prints JSON with --format json", async () => {
    const { deps, out } = makeDeps();
    expect(await run(["notes.md", "--format", "json"], deps)).toBe(0);
    expect(JSON.parse(out.join("")).title).toBe("Weekly sync");
  });

  it("reads stdin for '-' and when piped", async () => {
    const a = makeDeps();
    expect(await run(["-"], a.deps)).toBe(0);
    const b = makeDeps({ stdinIsTTY: false });
    expect(await run([], b.deps)).toBe(0);
    expect(JSON.stringify(b.create.mock.calls[0])).toContain("stdin notes");
  });

  it("errors when no input is given on a TTY", async () => {
    const { deps, err } = makeDeps();
    expect(await run([], deps)).toBe(1);
    expect(err.join("")).toMatch(/no input/i);
  });

  it("passes model from flag over env", async () => {
    const { deps, create } = makeDeps({ env: { ANTHROPIC_API_KEY: "k", BRIEF_MODEL: "env-m" } });
    await run(["n.md", "--model", "flag-m"], deps);
    expect(create.mock.calls[0]?.[0].model).toBe("flag-m");
  });

  it("writes to a file with --output", async () => {
    const { deps, out, writeFile } = makeDeps();
    expect(await run(["n.md", "-o", "brief.md"], deps)).toBe(0);
    expect(writeFile).toHaveBeenCalledWith("brief.md", expect.stringContaining("# Weekly sync"));
    expect(out.join("")).toBe("");
  });

  it("fails clearly without an API key", async () => {
    const { deps, err, createClient } = makeDeps({ env: {} });
    expect(await run(["n.md"], deps)).toBe(1);
    expect(err.join("")).toContain("ANTHROPIC_API_KEY");
    expect(createClient).not.toHaveBeenCalled();
  });

  it("fails clearly on empty input", async () => {
    const { deps, err } = makeDeps({ readFile: () => Promise.resolve("   ") });
    expect(await run(["n.md"], deps)).toBe(1);
    expect(err.join("")).toMatch(/empty/i);
  });

  it("reports unreadable files", async () => {
    const { deps, err } = makeDeps({ readFile: () => Promise.reject(new Error("ENOENT: nope")) });
    expect(await run(["missing.md"], deps)).toBe(1);
    expect(err.join("")).toContain("missing.md");
  });

  it("reports unwritable output", async () => {
    const { deps, err } = makeDeps({ writeFile: () => Promise.reject(new Error("EACCES")) });
    expect(await run(["n.md", "-o", "x"], deps)).toBe(1);
    expect(err.join("")).toContain("EACCES");
  });

  it("reports API errors without a stack trace", async () => {
    const e = new Anthropic.AuthenticationError(401, undefined, "bad", new Headers());
    const { deps, err } = makeDeps({
      createClient: () => ({ messages: { create: () => Promise.reject(e) } }),
    });
    expect(await run(["n.md"], deps)).toBe(1);
    expect(err.join("")).toMatch(/authentication/i);
    expect(err.join("")).not.toContain("    at ");
  });

  it("reports usage errors", async () => {
    const { deps, err } = makeDeps();
    expect(await run(["--bogus"], deps)).toBe(2);
    expect(err.join("")).toContain("--bogus");
  });

  it("prints help and version", async () => {
    const h = makeDeps();
    expect(await run(["--help"], h.deps)).toBe(0);
    expect(h.out.join("")).toContain("Usage");
    const v = makeDeps();
    expect(await run(["--version"], v.deps)).toBe(0);
    expect(v.out.join("")).toMatch(/\d+\.\d+\.\d+/);
  });
});
