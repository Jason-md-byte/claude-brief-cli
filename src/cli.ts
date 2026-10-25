import { generateBrief, type BriefClient } from "./brief.js";
import { parseArgs, resolveApiKey, resolveModel, type Env } from "./config.js";
import { BriefError, ErrorCode } from "./errors.js";
import { renderBrief } from "./render.js";

export const VERSION = "0.1.0";

export type CliDeps = {
  env: Env;
  readFile: (path: string) => Promise<string>;
  readStdin: () => Promise<string>;
  writeFile: (path: string, data: string) => Promise<void>;
  stdinIsTTY: boolean;
  stdout: (text: string) => void;
  stderr: (text: string) => void;
  createClient: (apiKey: string) => BriefClient;
};

const HELP = `claude-brief - turn messy notes into a structured brief

Usage:
  claude-brief [file] [options]
  cat notes.md | claude-brief [options]

Options:
  -f, --format <markdown|json>  Output format (default: markdown)
  -m, --model <id>              Model id (default: $BRIEF_MODEL or claude-sonnet-5-5)
  -o, --output <path>           Write to a file instead of stdout
  -h, --help                    Show this help
  -v, --version                 Show version

Environment:
  ANTHROPIC_API_KEY  Required.
  BRIEF_MODEL        Optional default model.
`;

async function readInput(file: string | undefined, deps: CliDeps): Promise<string> {
  if (file === undefined && deps.stdinIsTTY) {
    throw new BriefError(ErrorCode.EmptyInput, "No input. Pass a file path or pipe text on stdin (see --help).");
  }
  if (file === undefined || file === "-") return deps.readStdin();
  try {
    return await deps.readFile(file);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new BriefError(ErrorCode.FileRead, `Could not read "${file}": ${reason}`, { cause: error });
  }
}

async function writeOutput(path: string, data: string, deps: CliDeps): Promise<void> {
  try {
    await deps.writeFile(path, data);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new BriefError(ErrorCode.FileWrite, `Could not write "${path}": ${reason}`, { cause: error });
  }
}

/** Runs the CLI and returns the process exit code. All I/O goes through `deps`. */
export async function run(argv: readonly string[], deps: CliDeps): Promise<number> {
  try {
    const args = parseArgs(argv);
    if (args.kind === "help") {
      deps.stdout(HELP);
      return 0;
    }
    if (args.kind === "version") {
      deps.stdout(`${VERSION}\n`);
      return 0;
    }

    const apiKey = resolveApiKey(deps.env);
    const text = await readInput(args.file, deps);
    const client = deps.createClient(apiKey);
    const brief = await generateBrief(client, { text, model: resolveModel(args.model, deps.env) });
    const rendered = renderBrief(brief, args.format);

    if (args.output === undefined) deps.stdout(rendered);
    else await writeOutput(args.output, rendered, deps);
    return 0;
  } catch (error) {
    if (error instanceof BriefError) {
      deps.stderr(`error: ${error.message}\n`);
      return error.code === ErrorCode.Usage ? 2 : 1;
    }
    const message = error instanceof Error ? error.message : String(error);
    deps.stderr(`error: unexpected failure: ${message}\n`);
    return 1;
  }
}
