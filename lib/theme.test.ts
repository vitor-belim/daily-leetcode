import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applyResolvedTheme,
  applyTheme,
  DARK_THEME_CLASS,
  oppositeTheme,
  parseTheme,
  readAppliedTheme,
  readStoredTheme,
  resolveTheme,
  SYSTEM_DARK_QUERY,
  systemPrefersDark,
  Theme,
  THEME_RESTORE_SCRIPT,
  THEME_STORAGE_KEY,
  writeTheme,
} from "./theme";

interface FakeStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

interface FakeClassList {
  toggle: (name: string, force: boolean) => boolean;
  contains: (name: string) => boolean;
}

interface FakeRootStyle {
  colorScheme: string;
}

interface FakeRoot {
  classes: Set<string>;
  classList: FakeClassList;
  style: FakeRootStyle;
}

interface FakeMediaQueryList {
  matches: boolean;
}

interface FakeWindow {
  localStorage: FakeStorage;
  matchMedia: (query: string) => FakeMediaQueryList;
}

/**
 * A localStorage stand-in backed by a Map, since the suite runs without a DOM.
 */
function fakeStorage(entries: Record<string, string> = {}): FakeStorage {
  const values = new Map(Object.entries(entries));

  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}

/**
 * A window whose storage holds the given entries and whose color-scheme
 * query reports the given system appearance.
 */
function fakeWindow(
  entries: Record<string, string>,
  systemDark: boolean,
): FakeWindow {
  return {
    localStorage: fakeStorage(entries),
    matchMedia: (query) => ({
      matches: query === SYSTEM_DARK_QUERY && systemDark,
    }),
  };
}

/**
 * A window whose storage throws on access, as in modes that block site data,
 * and whose color-scheme query reports the given system appearance.
 */
function deniedStorageWindow(systemDark: boolean): FakeWindow {
  return {
    get localStorage(): FakeStorage {
      throw new Error("access denied");
    },
    matchMedia: (query) => ({
      matches: query === SYSTEM_DARK_QUERY && systemDark,
    }),
  };
}

/**
 * An `<html>` element stand-in recording its classes and color-scheme.
 */
function fakeRoot(initialClasses: string[] = []): FakeRoot {
  const classes = new Set(initialClasses);

  return {
    classes,
    classList: {
      toggle: (name, force) => {
        if (force) classes.add(name);
        else classes.delete(name);
        return force;
      },
      contains: (name) => classes.has(name),
    },
    style: { colorScheme: "" },
  };
}

/**
 * Runs the inline script the way the browser would, with window and document
 * supplied as locals so the suite needs no DOM.
 */
function runRestoreScript(windowStub: unknown, root: FakeRoot): void {
  new Function("window", "document", THEME_RESTORE_SCRIPT)(windowStub, {
    documentElement: root,
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("parseTheme", () => {
  // Raw strings on purpose: they pin the format persisted in localStorage,
  // which must keep parsing after any rename of the enum members.
  it.each([
    ["light", Theme.Light],
    ["dark", Theme.Dark],
  ])("reads %s", (value, expected) => {
    expect(parseTheme(value)).toBe(expected);
  });

  it.each([null, "", "Dark", "system", "sepia"])("rejects %o", (value) => {
    expect(parseTheme(value)).toBeNull();
  });
});

describe("resolveTheme", () => {
  it("prefers the reader's explicit choice over the system", () => {
    expect(resolveTheme(Theme.Light, true)).toBe(Theme.Light);
    expect(resolveTheme(Theme.Dark, false)).toBe(Theme.Dark);
  });

  it("follows the system when the reader never chose", () => {
    expect(resolveTheme(null, true)).toBe(Theme.Dark);
    expect(resolveTheme(null, false)).toBe(Theme.Light);
  });
});

describe("oppositeTheme", () => {
  it("switches between the two themes", () => {
    expect(oppositeTheme(Theme.Light)).toBe(Theme.Dark);
    expect(oppositeTheme(Theme.Dark)).toBe(Theme.Light);
  });
});

describe("readStoredTheme", () => {
  it("returns the stored choice", () => {
    vi.stubGlobal(
      "window",
      fakeWindow({ [THEME_STORAGE_KEY]: Theme.Dark }, false),
    );

    expect(readStoredTheme()).toBe(Theme.Dark);
  });

  it("returns null when nothing valid is stored", () => {
    vi.stubGlobal("window", fakeWindow({ [THEME_STORAGE_KEY]: "neon" }, false));

    expect(readStoredTheme()).toBeNull();
  });

  it("returns null when storage denies access", () => {
    vi.stubGlobal("window", {
      get localStorage(): FakeStorage {
        throw new Error("access denied");
      },
    });

    expect(readStoredTheme()).toBeNull();
  });
});

describe("writeTheme", () => {
  it("stores the choice under the theme key", () => {
    const windowStub = fakeWindow({}, false);
    vi.stubGlobal("window", windowStub);

    expect(writeTheme(Theme.Dark)).toBe(true);
    expect(windowStub.localStorage.getItem(THEME_STORAGE_KEY)).toBe(Theme.Dark);
  });

  it("reports failure when storage is full or denied", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => null,
        setItem: () => {
          throw new Error("quota exceeded");
        },
      },
    });

    expect(writeTheme(Theme.Light)).toBe(false);
  });
});

describe("systemPrefersDark", () => {
  it.each([true, false])("reports a system preference of dark=%s", (dark) => {
    vi.stubGlobal("window", fakeWindow({}, dark));

    expect(systemPrefersDark()).toBe(dark);
  });
});

describe("applyTheme and readAppliedTheme", () => {
  it("adds the dark class and dark color-scheme, and reads them back", () => {
    const root = fakeRoot();
    vi.stubGlobal("document", { documentElement: root });

    applyTheme(Theme.Dark);

    expect([...root.classes]).toEqual([DARK_THEME_CLASS]);
    expect(root.style.colorScheme).toBe(Theme.Dark);
    expect(readAppliedTheme()).toBe(Theme.Dark);
  });

  it("removes the dark class and leaves the other classes alone", () => {
    // The font variable classes live on <html> too.
    const root = fakeRoot(["font-vars", DARK_THEME_CLASS]);
    vi.stubGlobal("document", { documentElement: root });

    applyTheme(Theme.Light);

    expect([...root.classes]).toEqual(["font-vars"]);
    expect(root.style.colorScheme).toBe(Theme.Light);
    expect(readAppliedTheme()).toBe(Theme.Light);
  });
});

describe("THEME_RESTORE_SCRIPT", () => {
  it.each([
    ["a stored dark choice", { [THEME_STORAGE_KEY]: Theme.Dark }, false, true],
    [
      "a stored light choice over a dark system",
      { [THEME_STORAGE_KEY]: Theme.Light },
      true,
      false,
    ],
    ["no choice on a dark system", {}, true, true],
    ["no choice on a light system", {}, false, false],
    [
      "a corrupt choice on a dark system",
      { [THEME_STORAGE_KEY]: "neon" },
      true,
      true,
    ],
  ])(
    "renders %s before first paint",
    (_label, entries, systemDark, expectDark) => {
      const root = fakeRoot();

      runRestoreScript(fakeWindow(entries, systemDark), root);

      expect(root.classes.has(DARK_THEME_CLASS)).toBe(expectDark);
      expect(root.style.colorScheme).toBe(
        expectDark ? Theme.Dark : Theme.Light,
      );
    },
  );

  it("agrees with resolveTheme and applyTheme", () => {
    // The inline copy must stay in step with the bundled functions it mirrors.
    for (const stored of [null, Theme.Light, Theme.Dark]) {
      for (const systemDark of [true, false]) {
        const scripted = fakeRoot();
        runRestoreScript(
          fakeWindow(
            stored === null ? {} : { [THEME_STORAGE_KEY]: stored },
            systemDark,
          ),
          scripted,
        );

        const bundled = fakeRoot();
        vi.stubGlobal("document", { documentElement: bundled });
        applyTheme(resolveTheme(stored, systemDark));

        expect([...scripted.classes]).toEqual([...bundled.classes]);
        expect(scripted.style.colorScheme).toBe(bundled.style.colorScheme);
      }
    }
  });

  it.each([true, false])(
    "falls back to the system (dark=%s) when storage denies access, as the bundled resolver does",
    (systemDark) => {
      const scripted = fakeRoot();
      expect(() =>
        runRestoreScript(deniedStorageWindow(systemDark), scripted),
      ).not.toThrow();

      const bundled = fakeRoot();
      vi.stubGlobal("window", deniedStorageWindow(systemDark));
      vi.stubGlobal("document", { documentElement: bundled });
      applyResolvedTheme();

      expect(scripted.classes.has(DARK_THEME_CLASS)).toBe(systemDark);
      expect([...scripted.classes]).toEqual([...bundled.classes]);
      expect(scripted.style.colorScheme).toBe(bundled.style.colorScheme);
    },
  );
});

describe("applyResolvedTheme", () => {
  it("applies and returns the stored choice over the system", () => {
    const root = fakeRoot();
    vi.stubGlobal(
      "window",
      fakeWindow({ [THEME_STORAGE_KEY]: Theme.Light }, true),
    );
    vi.stubGlobal("document", { documentElement: root });

    expect(applyResolvedTheme()).toBe(Theme.Light);
    expect(root.classes.has(DARK_THEME_CLASS)).toBe(false);
  });

  it("lets a session choice win when storage could not keep it", () => {
    // Storage is denied, so only the in-memory choice remembers the click.
    const root = fakeRoot();
    vi.stubGlobal("window", deniedStorageWindow(false));
    vi.stubGlobal("document", { documentElement: root });

    expect(applyResolvedTheme(Theme.Dark)).toBe(Theme.Dark);
    expect(root.classes.has(DARK_THEME_CLASS)).toBe(true);
  });

  it("follows the system when nothing was chosen", () => {
    const root = fakeRoot();
    vi.stubGlobal("window", fakeWindow({}, true));
    vi.stubGlobal("document", { documentElement: root });

    expect(applyResolvedTheme()).toBe(Theme.Dark);
    expect(root.style.colorScheme).toBe(Theme.Dark);
  });
});
