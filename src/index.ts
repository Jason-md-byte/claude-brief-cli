#!/usr/bin/env node
import Anthropic from "@anthropic-ai/sdk";
import { readFile, writeFile } from "node:fs/promises";
import { run } from "./cli.js";

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : (chunk as Buffer));
  }
  return Buffer.concat(chunks).toString("utf8");
}

const code = await run(process.argv.slice(2), {
  env: process.env,
  readFile: (path) => readFile(path, "utf8"),
  readStdin,
  writeFile: (path, data) => writeFile(path, data, "utf8"),
  stdinIsTTY: process.stdin.isTTY,
  stdout: (text) => process.stdout.write(text),
  stderr: (text) => process.stderr.write(text),
  createClient: (apiKey) => new Anthropic({ apiKey }),
});
process.exitCode = code;
