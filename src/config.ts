import { parseArgs as nodeParseArgs } from "node:util";
import { BriefError, ErrorCode } from "./errors.js";
import { OutputFormat } from "./render.js";

export const DEFAULT_MODEL = "claude-sonnet-5-5";

export type Env = Readonly<Record<string, string | undefined>>;

export type ParsedArgs =
  | { kind: "help" }
  | { kind: "version" }
  | {
      kind: "run";
      file: string | undefined;
      format: OutputFormat;
      model: string | undefined;
      output: string | undefined;
    };

export function resolveApiKey(env: Env): string {
  const key = env["ANTHROPIC_API_KEY"]?.trim();
  if (key === undefined || key === "") {
    throw new BriefError(
      ErrorCode.MissingApiKey,
      "ANTHROPIC_API_KEY is not set. Export it in your shell (see .env.example).",
    );
  }
  return key;
}

export function resolveModel(flag: string | undefined, env: Env): string {
  const fromEnv = env["BRIEF_MODEL"]?.trim();
  return flag ?? (fromEnv === undefined || fromEnv === "" ? DEFAULT_MODEL : fromEnv);
}

function isFormat(value: string): value is OutputFormat {
  return Object.values(OutputFormat).some((f) => f === value);
}

export function parseArgs(argv: readonly string[]): ParsedArgs {
  let parsed: ReturnType<typeof readArgs>;
  try {
    parsed = readArgs(argv);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new BriefError(ErrorCode.Usage, message, { cause: error });
  }
  const { values, positionals } = parsed;

  if (values.help === true) return { kind: "help" };
  if (values.version === true) return { kind: "version" };
  if (positionals.length > 1) {
    throw new BriefError(ErrorCode.Usage, "Expected at most one input file.");
  }

  const format = values.format ?? OutputFormat.Markdown;
  if (!isFormat(format)) {
    throw new BriefError(ErrorCode.Usage, `Invalid --format "${format}". Use "markdown" or "json".`);
  }
  return { kind: "run", file: positionals[0], format, model: values.model, output: values.output };
}

function readArgs(argv: readonly string[]) {
  return nodeParseArgs({
    args: [...argv],
    allowPositionals: true,
    options: {
      format: { type: "string", short: "f" },
      model: { type: "string", short: "m" },
      output: { type: "string", short: "o" },
      help: { type: "boolean", short: "h" },
      version: { type: "boolean", short: "v" },
    },
  });
}
