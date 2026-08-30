import { execFileSync } from "child_process";
import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";

export enum ChromeCookieName {
  Session = "LEETCODE_SESSION",
  CsrfToken = "csrftoken",
}

export interface EncryptedCookie {
  host: string;
  name: string;
  value: Buffer;
}

export interface LeetCodeCookies {
  profile: string;
  session: string;
  csrfToken: string;
}

export interface ProfileCookieDatabase {
  profile: string;
  database: string;
}

const CHROME_ROOT = path.join(
  os.homedir(),
  "Library",
  "Application Support",
  "Google",
  "Chrome",
);
const SAFE_STORAGE_SERVICE = "Chrome Safe Storage";
const SAFE_STORAGE_ACCOUNT = "Chrome";
const KEY_SALT = "saltysalt";
const KEY_ITERATIONS = 1003;
const KEY_LENGTH = 16;
const BLOCK_SIZE = 16;
const ENCRYPTION_IV = Buffer.alloc(BLOCK_SIZE, " ");
const VERSION_PREFIX = "v10";
const DOMAIN_HASH_LENGTH = 32;
const DEFAULT_PROFILE = "Default";
const COOKIE_FILES = [path.join("Network", "Cookies"), "Cookies"];

/**
 * Stretches Chrome's Safe Storage password into its AES cookie key.
 *
 * @param password The Safe Storage password held in the login Keychain.
 * @returns The 16-byte AES key Chrome encrypts cookie values with.
 */
export function deriveKey(password: string): Buffer {
  return crypto.pbkdf2Sync(
    password,
    KEY_SALT,
    KEY_ITERATIONS,
    KEY_LENGTH,
    "sha1",
  );
}

/**
 * Reads Chrome's Safe Storage password from the macOS Keychain and derives the cookie key.
 *
 * @returns The AES key for this machine's Chrome cookie database.
 * @throws When the Keychain prompt is denied or Chrome has no Safe Storage entry.
 */
export function safeStorageKey(): Buffer {
  try {
    const password = execFileSync(
      "security",
      [
        "find-generic-password",
        "-w",
        "-s",
        SAFE_STORAGE_SERVICE,
        "-a",
        SAFE_STORAGE_ACCOUNT,
      ],
      { encoding: "utf8" },
    ).trim();
    return deriveKey(password);
  } catch {
    throw new Error(
      `Could not read "${SAFE_STORAGE_SERVICE}" from the Keychain. Approve the Keychain prompt (choose Always Allow to stop it recurring), then rerun.`,
    );
  }
}

/**
 * Strips the PKCS#7 padding left by decrypting with auto-padding disabled.
 *
 * @param padded The raw decrypted block sequence.
 * @returns The buffer without its trailing padding bytes.
 */
function stripPadding(padded: Buffer): Buffer {
  const padding = padded[padded.length - 1] ?? 0;
  if (padding === 0 || padding > BLOCK_SIZE || padding > padded.length) {
    return padded;
  }
  return padded.subarray(0, padded.length - padding);
}

/**
 * Decrypts one Chrome cookie value, unwrapping the domain hash Chrome 118+ prepends.
 *
 * @param cookie The cookie row, with its raw `encrypted_value` bytes.
 * @param key The AES key from {@link safeStorageKey}.
 * @returns The plaintext cookie value, or the raw bytes when the row is unencrypted.
 */
export function decryptCookie(cookie: EncryptedCookie, key: Buffer): string {
  if (
    cookie.value.subarray(0, VERSION_PREFIX.length).toString("utf8") !==
    VERSION_PREFIX
  ) {
    return cookie.value.toString("utf8");
  }
  const decipher = crypto.createDecipheriv("aes-128-cbc", key, ENCRYPTION_IV);
  decipher.setAutoPadding(false);
  const plain = stripPadding(
    Buffer.concat([
      decipher.update(cookie.value.subarray(VERSION_PREFIX.length)),
      decipher.final(),
    ]),
  );
  const domainHash = crypto.createHash("sha256").update(cookie.host).digest();
  if (
    plain.length >= DOMAIN_HASH_LENGTH &&
    plain.subarray(0, DOMAIN_HASH_LENGTH).equals(domainHash)
  ) {
    return plain.subarray(DOMAIN_HASH_LENGTH).toString("utf8");
  }
  return plain.toString("utf8");
}

/**
 * Locates a profile's cookie database.
 *
 * Current Chrome builds keep it under `Network/`, older ones at the profile root, so both
 * layouts are probed and the newer one wins when a profile holds a leftover of each.
 *
 * @param directory A Chrome profile directory.
 * @returns The database path, or null when the profile has none.
 */
function profileDatabase(directory: string): string | null {
  for (const candidate of COOKIE_FILES) {
    const database = path.join(directory, candidate);
    if (fs.existsSync(database)) {
      return database;
    }
  }
  return null;
}

/**
 * Lists every Chrome profile cookie database on this machine, `Default` first.
 *
 * @param root The Chrome user-data directory (defaults to the standard macOS location).
 * @returns Each profile's name paired with its cookie database path.
 * @throws When the Chrome user-data directory cannot be read.
 */
export function cookieDatabases(
  root: string = CHROME_ROOT,
): ProfileCookieDatabase[] {
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((left, right) => {
      if (left === DEFAULT_PROFILE) return -1;
      if (right === DEFAULT_PROFILE) return 1;
      return left.localeCompare(right);
    })
    .map((profile) => ({
      profile,
      database: profileDatabase(path.join(root, profile)),
    }))
    .filter((entry): entry is ProfileCookieDatabase => entry.database !== null);
}

/**
 * Reads the LeetCode cookie rows from a Chrome cookie database.
 *
 * Chrome holds the live database open, so it is copied before being queried.
 *
 * @param database Path to a profile's `Cookies` database.
 * @returns The matching rows with their still-encrypted values.
 * @throws When the database cannot be copied or `sqlite3` returns an unreadable row.
 */
export function readEncryptedCookies(database: string): EncryptedCookie[] {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "chrome-cookies-"));
  const copy = path.join(directory, "Cookies");
  try {
    fs.copyFileSync(database, copy);
    const query = `SELECT host_key || '|' || name || '|' || hex(encrypted_value) FROM cookies WHERE host_key LIKE '%leetcode.com' AND name IN ('${ChromeCookieName.Session}', '${ChromeCookieName.CsrfToken}');`;
    return execFileSync("sqlite3", [copy, query], { encoding: "utf8" })
      .split("\n")
      .filter((line) => line.length > 0)
      .map((line) => {
        const [host, name, value] = line.split("|");
        if (host === undefined || name === undefined || value === undefined) {
          throw new Error(`Unexpected cookie row: ${line}`);
        }
        return { host, name, value: Buffer.from(value, "hex") };
      });
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

/**
 * Finds the first Chrome profile holding a complete signed-in LeetCode session.
 *
 * @param key The AES key from {@link safeStorageKey}.
 * @param databases The cookie databases to search (defaults to every local profile).
 * @returns The decrypted session cookie, CSRF token, and the profile they came from.
 * @throws When no profile holds both cookies.
 */
export function readLeetCodeCookies(
  key: Buffer,
  databases: ProfileCookieDatabase[] = cookieDatabases(),
): LeetCodeCookies {
  for (const { profile, database } of databases) {
    const values = new Map<string, string>();
    for (const cookie of readEncryptedCookies(database)) {
      const value = decryptCookie(cookie, key);
      const existing = values.get(cookie.name);
      if (
        value.length > 0 &&
        (existing === undefined || value.length > existing.length)
      ) {
        values.set(cookie.name, value);
      }
    }
    const session = values.get(ChromeCookieName.Session);
    const csrfToken = values.get(ChromeCookieName.CsrfToken);
    if (session !== undefined && csrfToken !== undefined) {
      return { profile, session, csrfToken };
    }
  }
  throw new Error(
    "No signed-in LeetCode session found in any Chrome profile. Log in at https://leetcode.com in Chrome, then rerun.",
  );
}
