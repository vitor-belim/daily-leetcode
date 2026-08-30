import { execFileSync } from "child_process";
import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ChromeCookieName,
  cookieDatabases,
  decryptCookie,
  deriveKey,
  readLeetCodeCookies,
  type EncryptedCookie,
} from "./chrome-cookies";

const HOST = ".leetcode.com";
const KEY = deriveKey("test-safe-storage-password");
const SESSION_JWT = `${"a".repeat(120)}.${"b".repeat(180)}.${"c".repeat(43)}`;

// Mirrors how Chrome writes `encrypted_value`: the "v10" marker, then AES-128-CBC over the
// value, prefixed since Chrome 118 with the SHA-256 of the cookie's host_key.
function encryptLikeChrome(value: string, host: string | null): Buffer {
  const cipher = crypto.createCipheriv(
    "aes-128-cbc",
    KEY,
    Buffer.alloc(16, " "),
  );
  const domainHash =
    host === null
      ? Buffer.alloc(0)
      : crypto.createHash("sha256").update(host).digest();
  const plain = Buffer.concat([domainHash, Buffer.from(value, "utf8")]);
  return Buffer.concat([
    Buffer.from("v10"),
    cipher.update(plain),
    cipher.final(),
  ]);
}

function cookie(value: Buffer, host: string = HOST): EncryptedCookie {
  return { host, name: "LEETCODE_SESSION", value };
}

describe("decryptCookie", () => {
  it("round-trips a Chrome 118+ value, stripping the domain hash", () => {
    const encrypted = cookie(encryptLikeChrome(SESSION_JWT, HOST));
    expect(decryptCookie(encrypted, KEY)).toBe(SESSION_JWT);
  });

  it("round-trips a legacy value written without a domain hash", () => {
    const encrypted = cookie(encryptLikeChrome(SESSION_JWT, null));
    expect(decryptCookie(encrypted, KEY)).toBe(SESSION_JWT);
  });

  // A value whose length is an exact multiple of the block size gets a full block of
  // padding, which must be stripped rather than returned as trailing bytes.
  it("strips a full trailing padding block", () => {
    const exactBlocks = "x".repeat(32);
    const encrypted = cookie(encryptLikeChrome(exactBlocks, HOST));
    expect(decryptCookie(encrypted, KEY)).toBe(exactBlocks);
  });

  it("returns unencrypted rows as-is when the v10 marker is absent", () => {
    const encrypted = cookie(Buffer.from("plain-token", "utf8"));
    expect(decryptCookie(encrypted, KEY)).toBe("plain-token");
  });

  // The domain hash only matches when host_key matches, so a row decrypted against the
  // wrong host must not silently drop its first 32 characters.
  it("keeps the plaintext intact when the host does not match the domain hash", () => {
    const encrypted = cookie(encryptLikeChrome(SESSION_JWT, HOST), "other.com");
    expect(decryptCookie(encrypted, KEY)).toBe(
      crypto.createHash("sha256").update(HOST).digest().toString("utf8") +
        SESSION_JWT,
    );
  });

  it("does not yield the plaintext under a different Safe Storage key", () => {
    const encrypted = cookie(encryptLikeChrome(SESSION_JWT, HOST));
    expect(decryptCookie(encrypted, deriveKey("wrong-password"))).not.toBe(
      SESSION_JWT,
    );
  });
});

describe("deriveKey", () => {
  it("derives a 16-byte AES key deterministically per password", () => {
    expect(deriveKey("hunter2")).toHaveLength(16);
    expect(deriveKey("hunter2")).toEqual(deriveKey("hunter2"));
    expect(deriveKey("hunter2")).not.toEqual(deriveKey("hunter3"));
  });
});

let chromeRoot: string;

beforeEach(() => {
  chromeRoot = fs.mkdtempSync(path.join(os.tmpdir(), "chrome-root-"));
});

afterEach(() => {
  fs.rmSync(chromeRoot, { recursive: true, force: true });
});

// Builds a real sqlite database shaped like Chrome's, so the sqlite3 query, the row parsing
// and the decryption are all exercised together rather than mocked away.
function writeCookieDatabase(
  profile: string,
  rows: EncryptedCookie[],
  layout: string = "Cookies",
): string {
  const database = path.join(chromeRoot, profile, layout);
  fs.mkdirSync(path.dirname(database), { recursive: true });
  const values = rows
    .map(
      (row) =>
        `('${row.host}', '${row.name}', X'${row.value.toString("hex")}')`,
    )
    .join(", ");
  const insert =
    rows.length > 0
      ? `INSERT INTO cookies (host_key, name, encrypted_value) VALUES ${values};`
      : "";
  execFileSync("sqlite3", [
    database,
    `CREATE TABLE cookies (host_key TEXT, name TEXT, encrypted_value BLOB);${insert}`,
  ]);
  return database;
}

function row(name: ChromeCookieName, value: string): EncryptedCookie {
  return { host: HOST, name, value: encryptLikeChrome(value, HOST) };
}

describe("cookieDatabases", () => {
  it("orders Default first and skips profiles without a database", () => {
    writeCookieDatabase("Profile 1", []);
    writeCookieDatabase("Default", []);
    fs.mkdirSync(path.join(chromeRoot, "Guest Profile"), { recursive: true });
    expect(cookieDatabases(chromeRoot).map((entry) => entry.profile)).toEqual([
      "Default",
      "Profile 1",
    ]);
  });

  // Current Chrome keeps cookies under Network/; a profile carrying both layouts must
  // resolve to the newer one, and the reported profile name must stay the profile
  // directory rather than the "Network" subdirectory.
  it("prefers Network/Cookies over a legacy root database", () => {
    writeCookieDatabase("Default", []);
    const current = writeCookieDatabase(
      "Default",
      [],
      path.join("Network", "Cookies"),
    );
    expect(cookieDatabases(chromeRoot)).toEqual([
      { profile: "Default", database: current },
    ]);
  });
});

describe("readLeetCodeCookies", () => {
  it("skips profiles missing a cookie and reports the one that has both", () => {
    writeCookieDatabase("Default", [
      row(ChromeCookieName.Session, SESSION_JWT),
    ]);
    writeCookieDatabase("Profile 1", [
      row(ChromeCookieName.Session, SESSION_JWT),
      row(ChromeCookieName.CsrfToken, "csrf-value"),
    ]);
    expect(readLeetCodeCookies(KEY, cookieDatabases(chromeRoot))).toEqual({
      profile: "Profile 1",
      session: SESSION_JWT,
      csrfToken: "csrf-value",
    });
  });

  // LeetCode writes the session under both ".leetcode.com" and "leetcode.com"; a stale
  // truncated row must not win over the usable one.
  it("keeps the longest value when a cookie name appears more than once", () => {
    writeCookieDatabase("Default", [
      { host: HOST, name: ChromeCookieName.Session, value: encryptLikeChrome("short", HOST) },
      row(ChromeCookieName.Session, SESSION_JWT),
      row(ChromeCookieName.CsrfToken, "csrf-value"),
    ]);
    expect(readLeetCodeCookies(KEY, cookieDatabases(chromeRoot)).session).toBe(
      SESSION_JWT,
    );
  });

  // An empty encrypted_value decodes to "", which must count as missing rather than
  // being written to .env as a blank credential.
  it("throws when no profile holds both cookies", () => {
    writeCookieDatabase("Default", [
      row(ChromeCookieName.Session, SESSION_JWT),
      { host: HOST, name: ChromeCookieName.CsrfToken, value: Buffer.alloc(0) },
    ]);
    expect(() => readLeetCodeCookies(KEY, cookieDatabases(chromeRoot))).toThrow(
      /No signed-in LeetCode session found/,
    );
  });
});
