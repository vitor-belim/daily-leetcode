import { readLeetCodeCookies, safeStorageKey } from "@/lib/chrome-cookies";
import { updateEnvFile } from "@/lib/env-file";
import { verifyAuthentication } from "@/lib/leetcode-api";
import path from "path";

enum LeetCodeEnvVar {
  Session = "LEETCODE_SESSION",
  CsrfToken = "LEETCODE_CSRFTOKEN",
}

const ENV_FILE = path.join(process.cwd(), ".env");

async function main(): Promise<void> {
  try {
    const cookies = readLeetCodeCookies(safeStorageKey());
    updateEnvFile(
      ENV_FILE,
      new Map([
        [LeetCodeEnvVar.Session, cookies.session],
        [LeetCodeEnvVar.CsrfToken, cookies.csrfToken],
      ]),
    );
    process.env[LeetCodeEnvVar.Session] = cookies.session;
    process.env[LeetCodeEnvVar.CsrfToken] = cookies.csrfToken;
    console.log(
      `Updated ${LeetCodeEnvVar.Session} (${cookies.session.length} chars) and ${LeetCodeEnvVar.CsrfToken} in .env from Chrome profile "${cookies.profile}"`,
    );

    console.log(`Signed in as ${await verifyAuthentication()}`);
    process.exit(0);
  } catch (error) {
    console.error(
      "Error refreshing LeetCode cookies:",
      error instanceof Error ? error.message : error,
    );
    process.exit(1);
  }
}

main();
