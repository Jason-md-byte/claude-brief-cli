export const ErrorCode = {
  MissingApiKey: "MISSING_API_KEY",
  EmptyInput: "EMPTY_INPUT",
  InputTooLarge: "INPUT_TOO_LARGE",
  Usage: "USAGE",
  FileRead: "FILE_READ",
  FileWrite: "FILE_WRITE",
  Auth: "AUTH",
  RateLimit: "RATE_LIMIT",
  Network: "NETWORK",
  Api: "API",
  InvalidModelOutput: "INVALID_MODEL_OUTPUT",
  Unknown: "UNKNOWN",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/** An expected, user-facing failure. The CLI prints `message` without a stack trace. */
export class BriefError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "BriefError";
    this.code = code;
  }
}
