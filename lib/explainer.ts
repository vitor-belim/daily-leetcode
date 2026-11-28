import { execFileSync } from "child_process";
import fs from "fs";
import { parseSolutions } from "./archive-schema";
import { SOLUTIONS_ROOT, solutionFileExists, solutionFilePath } from "./paths";

/** A command line that drives the AI explainer CLI. */
export interface ExplainerCommand {
  command: string;
  args: string[];
}

/** How an {@link ExplainerCommand} is run. */
export interface ExplainerRunOptions {
  timeoutMs: number;
  /** Stream the command's output to the terminal instead of capturing it. */
  inheritOutput: boolean;
}

/**
 * Runs an explainer command to completion, throwing when it exits non-zero
 * or times out.
 */
export type ExplainerRunner = (
  command: ExplainerCommand,
  options: ExplainerRunOptions,
) => void;

const EXPLAINER_BINARY = "claude";
const EXPLAIN_TIMEOUT_MS = 10 * 60 * 1000;
const LOGIN_CHECK_TIMEOUT_MS = 2 * 60 * 1000;

/** Human-readable name of the explainer, for log messages. */
export const EXPLAINER_NAME = "Claude CLI";

/** What to do when {@link checkExplainerLogin} reports a problem. */
export const EXPLAINER_LOGIN_HINT =
  "Run `claude setup-token` and put the token in .env as CLAUDE_CODE_OAUTH_TOKEN, then rerun backfill.";

/**
 * Builds the command that fills in `aiExplanation` for every solution of one
 * day, via the project's `/explain` slash command.
 *
 * @param date The day as `YYYY-MM-DD`.
 * @returns The explainer command line for that day.
 */
export function explainCommand(date: string): ExplainerCommand {
  return {
    command: EXPLAINER_BINARY,
    args: ["-p", `/explain ${date}`, "--permission-mode", "acceptEdits"],
  };
}

/**
 * Builds the smallest prompt that proves the explainer can authenticate. A
 * status query is not enough: the CLI reports any token as logged in
 * without checking it against the API.
 *
 * @returns The explainer command line for the login check.
 */
export function loginCheckCommand(): ExplainerCommand {
  return {
    command: EXPLAINER_BINARY,
    args: ["-p", "Reply with the single word OK.", "--model", "haiku"],
  };
}

/**
 * The default {@link ExplainerRunner}: runs the command synchronously as a
 * child process, inheriting the current environment.
 *
 * @param command The command line to run.
 * @param options Timeout and whether to stream output.
 * @throws When the command exits non-zero, times out, or cannot be found;
 *   with captured output, the error carries `stdout` and `stderr`.
 */
export function runExplainerCommand(
  command: ExplainerCommand,
  options: ExplainerRunOptions,
): void {
  execFileSync(command.command, command.args, {
    stdio: options.inheritOutput ? "inherit" : ["ignore", "pipe", "pipe"],
    encoding: "utf8",
    timeout: options.timeoutMs,
  });
}

/**
 * Extracts what a failed command printed, so the real cause reaches the log
 * instead of a bare "Command failed".
 *
 * @param error The value thrown by the runner.
 * @returns The command's stderr then stdout, trimmed; the error message when
 *   both are empty; the value stringified when it is not an `Error`.
 */
export function failedCommandOutput(error: unknown): string {
  if (error instanceof Error && "stdout" in error && "stderr" in error) {
    const output = `${String(error.stderr)}${String(error.stdout)}`.trim();
    return output.length > 0 ? output : error.message;
  }
  return error instanceof Error ? error.message : String(error);
}

/**
 * Checks that the explainer can actually authenticate, by sending it one
 * tiny prompt.
 *
 * @param run The runner to use (defaults to {@link runExplainerCommand}).
 * @returns Null when the check succeeds; otherwise what the explainer
 *   printed when it failed.
 */
export function checkExplainerLogin(
  run: ExplainerRunner = runExplainerCommand,
): string | null {
  try {
    run(loginCheckCommand(), {
      timeoutMs: LOGIN_CHECK_TIMEOUT_MS,
      inheritOutput: false,
    });
    return null;
  } catch (error) {
    return failedCommandOutput(error);
  }
}

/**
 * Has the explainer write an `aiExplanation` for every solution of one day,
 * streaming its output to the terminal.
 *
 * @param date The day as `YYYY-MM-DD`.
 * @param run The runner to use (defaults to {@link runExplainerCommand}).
 * @throws When the explainer exits non-zero or times out.
 */
export function explainDate(
  date: string,
  run: ExplainerRunner = runExplainerCommand,
): void {
  run(explainCommand(date), {
    timeoutMs: EXPLAIN_TIMEOUT_MS,
    inheritOutput: true,
  });
}

/**
 * Checks whether every solution of one day has a non-blank `aiExplanation`.
 * A day recorded as unsolved (an empty array) has nothing to explain and so
 * counts as complete.
 *
 * @param date The day as `YYYY-MM-DD`.
 * @param root The solutions root (defaults to `data/solutions`).
 * @returns False when the file is missing, unreadable or malformed, or any
 *   solution lacks an explanation; true otherwise.
 */
export function isExplainComplete(
  date: string,
  root: string = SOLUTIONS_ROOT,
): boolean {
  if (!solutionFileExists(date, root)) return false;

  const filePath = solutionFilePath(date, root);
  try {
    const value: unknown = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return parseSolutions(value, filePath).every(
      (solution) => (solution.aiExplanation ?? "").trim().length > 0,
    );
  } catch {
    return false;
  }
}
