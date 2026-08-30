import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { updateEnvFile } from "./env-file";

let directory: string;
let envFile: string;

beforeEach(() => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), "env-file-"));
  envFile = path.join(directory, ".env");
});

afterEach(() => {
  fs.rmSync(directory, { recursive: true, force: true });
});

describe("updateEnvFile", () => {
  // Refreshing credentials must not disturb anything else the user keeps in .env.
  it("replaces values in place and leaves other lines untouched", () => {
    fs.writeFileSync(
      envFile,
      "# credentials\nLEETCODE_SESSION=old\n\nOTHER=keep\nLEETCODE_CSRFTOKEN=oldcsrf\n",
    );
    updateEnvFile(
      envFile,
      new Map([
        ["LEETCODE_SESSION", "new-session"],
        ["LEETCODE_CSRFTOKEN", "new-csrf"],
      ]),
    );
    expect(fs.readFileSync(envFile, "utf8")).toBe(
      "# credentials\nLEETCODE_SESSION=new-session\n\nOTHER=keep\nLEETCODE_CSRFTOKEN=new-csrf\n",
    );
  });

  it("appends names that are not already present", () => {
    fs.writeFileSync(envFile, "OTHER=keep\n");
    updateEnvFile(envFile, new Map([["LEETCODE_SESSION", "new-session"]]));
    expect(fs.readFileSync(envFile, "utf8")).toBe(
      "OTHER=keep\nLEETCODE_SESSION=new-session\n",
    );
  });

  it("creates the file when it does not exist", () => {
    updateEnvFile(envFile, new Map([["LEETCODE_SESSION", "new-session"]]));
    expect(fs.readFileSync(envFile, "utf8")).toBe(
      "LEETCODE_SESSION=new-session\n",
    );
  });

  // JWT session cookies are base64url segments, but a stray "=" must not split the line.
  it("writes values containing equals signs verbatim", () => {
    updateEnvFile(envFile, new Map([["LEETCODE_SESSION", "a.b.c=="]]));
    expect(fs.readFileSync(envFile, "utf8")).toBe("LEETCODE_SESSION=a.b.c==\n");
  });

  // Names are compared structurally, so metacharacters cannot match an unrelated line:
  // a regex built from "A.B" would otherwise overwrite "AxB".
  it("does not let regex metacharacters in a name match another line", () => {
    fs.writeFileSync(envFile, "AxB=untouched\n");
    updateEnvFile(envFile, new Map([["A.B", "value"]]));
    expect(fs.readFileSync(envFile, "utf8")).toBe("AxB=untouched\nA.B=value\n");
  });

  // A line with no "=" is not an assignment, and must not be matched by a name that
  // happens to be a prefix of it.
  it("ignores lines that are not assignments", () => {
    fs.writeFileSync(envFile, "LEETCODE_SESSIONX\n");
    updateEnvFile(envFile, new Map([["LEETCODE_SESSION", "s"]]));
    expect(fs.readFileSync(envFile, "utf8")).toBe(
      "LEETCODE_SESSIONX\nLEETCODE_SESSION=s\n",
    );
  });

  it("does not accumulate blank lines when the file has no trailing newline", () => {
    fs.writeFileSync(envFile, "OTHER=keep");
    updateEnvFile(envFile, new Map([["LEETCODE_SESSION", "s"]]));
    expect(fs.readFileSync(envFile, "utf8")).toBe(
      "OTHER=keep\nLEETCODE_SESSION=s\n",
    );
  });
});
