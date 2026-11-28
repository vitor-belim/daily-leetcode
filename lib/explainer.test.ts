import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  checkExplainerLogin,
  explainCommand,
  explainDate,
  failedCommandOutput,
  isExplainComplete,
  loginCheckCommand,
  type ExplainerCommand,
  type ExplainerRunOptions,
} from "./explainer";
import { solutionFilePath } from "./paths";

const DATE = "2026-11-28";

interface RecordedRun {
  command: ExplainerCommand;
  options: ExplainerRunOptions;
}

// Builds what execFileSync throws for a non-zero exit with captured output.
function commandError(stdout: string, stderr: string): Error {
  return Object.assign(new Error("Command failed: claude -p"), {
    stdout,
    stderr,
  });
}

function solution(aiExplanation?: string): Record<string, string> {
  return {
    author: "Vitor",
    code: "return 1;",
    language: "typescript",
    date: "2026-11-28T10:00:00.000Z",
    ...(aiExplanation === undefined ? {} : { aiExplanation }),
  };
}

describe("explainCommand", () => {
  it("runs the /explain slash command for the date with edits accepted", () => {
    expect(explainCommand(DATE)).toEqual({
      command: "claude",
      args: ["-p", `/explain ${DATE}`, "--permission-mode", "acceptEdits"],
    });
  });
});

describe("explainDate", () => {
  it("streams the explain command's output to the terminal", () => {
    const runs: RecordedRun[] = [];
    explainDate(DATE, (command, options) => {
      runs.push({ command, options });
    });

    expect(runs).toHaveLength(1);
    expect(runs[0]?.command).toEqual(explainCommand(DATE));
    expect(runs[0]?.options.inheritOutput).toBe(true);
  });

  it("propagates a failing run", () => {
    expect(() =>
      explainDate(DATE, () => {
        throw commandError("", "boom");
      }),
    ).toThrow("Command failed");
  });
});

describe("checkExplainerLogin", () => {
  it("returns null when the check prompt succeeds", () => {
    const runs: RecordedRun[] = [];
    const result = checkExplainerLogin((command, options) => {
      runs.push({ command, options });
    });

    expect(result).toBeNull();
    expect(runs[0]?.command).toEqual(loginCheckCommand());
    // Output is captured, not streamed, so the failure text can be reported.
    expect(runs[0]?.options.inheritOutput).toBe(false);
  });

  it("returns what the CLI printed when it fails", () => {
    const result = checkExplainerLogin(() => {
      throw commandError("", "Failed to authenticate: OAuth session expired\n");
    });

    expect(result).toBe("Failed to authenticate: OAuth session expired");
  });
});

describe("failedCommandOutput", () => {
  it("joins stderr and stdout, trimmed", () => {
    expect(failedCommandOutput(commandError("out\n", "err "))).toBe("err out");
  });

  // A failure that printed nothing still needs a cause in the log.
  it("falls back to the error message when nothing was printed", () => {
    expect(failedCommandOutput(commandError("", ""))).toBe(
      "Command failed: claude -p",
    );
  });

  // A missing binary throws ENOENT without stdout/stderr properties.
  it("uses the message of an error without captured output", () => {
    expect(failedCommandOutput(new Error("spawnSync claude ENOENT"))).toBe(
      "spawnSync claude ENOENT",
    );
  });

  it("stringifies a non-Error value", () => {
    expect(failedCommandOutput("plain")).toBe("plain");
  });
});

describe("isExplainComplete", () => {
  let root: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "explainer-test-"));
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  function writeSolutions(content: string): void {
    const filePath = solutionFilePath(DATE, root);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
  }

  it("is false when the day has no solutions file", () => {
    expect(isExplainComplete(DATE, root)).toBe(false);
  });

  // An unsolved day has nothing to explain.
  it("is true for an empty solutions file", () => {
    writeSolutions("[]");
    expect(isExplainComplete(DATE, root)).toBe(true);
  });

  it("is true when every solution has an explanation", () => {
    writeSolutions(
      JSON.stringify([solution("**Uses** a map."), solution("Loops.")]),
    );
    expect(isExplainComplete(DATE, root)).toBe(true);
  });

  it("is false when any solution lacks an explanation", () => {
    writeSolutions(JSON.stringify([solution("Loops."), solution()]));
    expect(isExplainComplete(DATE, root)).toBe(false);
  });

  // fetch-solution writes "" for a fresh submission; whitespace counts as blank too.
  it("is false for a blank or whitespace-only explanation", () => {
    writeSolutions(JSON.stringify([solution(""), solution("  \n")]));
    expect(isExplainComplete(DATE, root)).toBe(false);
  });

  it("is false for a malformed file", () => {
    writeSolutions("[{");
    expect(isExplainComplete(DATE, root)).toBe(false);
  });
});
