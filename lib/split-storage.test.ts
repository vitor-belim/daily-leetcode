import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applyLeftFraction,
  clampLeftFraction,
  DEFAULT_LEFT_FRACTION,
  MAX_LEFT_FRACTION,
  MIN_LEFT_FRACTION,
  parseLeftFraction,
  readLeftFraction,
  SPLIT_LEFT_VARIABLE,
  SPLIT_RESTORE_SCRIPT,
  SPLIT_STORAGE_KEY,
  writeLeftFraction,
} from "./split-storage";

interface FakeStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

interface FakeStyle {
  setProperty: (name: string, value: string) => void;
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
 * Installs a window whose localStorage is the given stand-in.
 */
function stubStorage(storage: FakeStorage): void {
  vi.stubGlobal("window", { localStorage: storage });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("clampLeftFraction", () => {
  it("leaves a fraction inside the allowed range untouched", () => {
    expect(clampLeftFraction(0.35)).toBe(0.35);
  });

  it.each([
    [0.9, MAX_LEFT_FRACTION],
    [1, MAX_LEFT_FRACTION],
    [42, MAX_LEFT_FRACTION],
    [0.01, MIN_LEFT_FRACTION],
    [0, MIN_LEFT_FRACTION],
    [-3, MIN_LEFT_FRACTION],
  ])("clamps %s to %s", (input, expected) => {
    expect(clampLeftFraction(input)).toBe(expected);
  });

  it.each([MIN_LEFT_FRACTION, MAX_LEFT_FRACTION])(
    "keeps the boundary value %s",
    (boundary) => {
      expect(clampLeftFraction(boundary)).toBe(boundary);
    },
  );

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    "falls back to the default split for %s",
    (input) => {
      expect(clampLeftFraction(input)).toBe(DEFAULT_LEFT_FRACTION);
    },
  );
});

describe("parseLeftFraction", () => {
  it("reads back a value written by writeLeftFraction", () => {
    expect(parseLeftFraction("0.3500")).toBe(0.35);
  });

  it("returns the default split when the key is absent", () => {
    expect(parseLeftFraction(null)).toBe(DEFAULT_LEFT_FRACTION);
  });

  it.each(["", "   ", "not-a-number", "NaN", "Infinity", "-Infinity"])(
    "returns the default split for %o",
    (stored) => {
      expect(parseLeftFraction(stored)).toBe(DEFAULT_LEFT_FRACTION);
    },
  );

  // A split saved before the range existed, or edited by hand, must still land
  // inside the range rather than starving a panel on load.
  it.each([
    ["0.95", MAX_LEFT_FRACTION],
    ["1", MAX_LEFT_FRACTION],
    ["0.01", MIN_LEFT_FRACTION],
    ["-0.5", MIN_LEFT_FRACTION],
  ])("clamps the stored value %s to %s", (stored, expected) => {
    expect(parseLeftFraction(stored)).toBe(expected);
  });

  it("accepts exponent notation", () => {
    expect(parseLeftFraction("3.5e-1")).toBe(0.35);
  });
});

describe("readLeftFraction", () => {
  it("reads the persisted split", () => {
    stubStorage(fakeStorage({ [SPLIT_STORAGE_KEY]: "0.3000" }));

    expect(readLeftFraction()).toBe(0.3);
  });

  it("clamps a persisted split that sits outside the allowed range", () => {
    stubStorage(fakeStorage({ [SPLIT_STORAGE_KEY]: "0.95" }));

    expect(readLeftFraction()).toBe(MAX_LEFT_FRACTION);
  });

  it("returns the default split when nothing is stored", () => {
    stubStorage(fakeStorage());

    expect(readLeftFraction()).toBe(DEFAULT_LEFT_FRACTION);
  });

  it("returns the default split when storage cannot be reached", () => {
    vi.stubGlobal("window", {
      get localStorage(): FakeStorage {
        throw new Error("access denied");
      },
    });

    expect(readLeftFraction()).toBe(DEFAULT_LEFT_FRACTION);
  });

  it("returns the default split when reading throws", () => {
    stubStorage({
      getItem: () => {
        throw new Error("access denied");
      },
      setItem: () => undefined,
    });

    expect(readLeftFraction()).toBe(DEFAULT_LEFT_FRACTION);
  });
});

describe("writeLeftFraction", () => {
  it("persists the split under the shared key", () => {
    const storage = fakeStorage();
    stubStorage(storage);

    expect(writeLeftFraction(0.35)).toBe(true);
    expect(storage.getItem(SPLIT_STORAGE_KEY)).toBe("0.3500");
  });

  it("persists a clamped value rather than the one it was given", () => {
    const storage = fakeStorage();
    stubStorage(storage);

    writeLeftFraction(0.95);

    expect(storage.getItem(SPLIT_STORAGE_KEY)).toBe(
      MAX_LEFT_FRACTION.toFixed(4),
    );
  });

  it("reports failure when storage rejects the write", () => {
    stubStorage({
      getItem: () => null,
      setItem: () => {
        throw new Error("quota exceeded");
      },
    });

    expect(writeLeftFraction(0.35)).toBe(false);
  });

  it("round-trips through readLeftFraction", () => {
    stubStorage(fakeStorage());

    writeLeftFraction(0.42);

    expect(readLeftFraction()).toBe(0.42);
  });
});

describe("applyLeftFraction", () => {
  it("publishes the split as a custom property on the document root", () => {
    const setProperty = vi.fn();
    vi.stubGlobal("document", {
      documentElement: { style: { setProperty } satisfies FakeStyle },
    });

    applyLeftFraction(0.35);

    expect(setProperty).toHaveBeenCalledWith(SPLIT_LEFT_VARIABLE, "0.35");
  });

  it("publishes a clamped value rather than the one it was given", () => {
    const setProperty = vi.fn();
    vi.stubGlobal("document", {
      documentElement: { style: { setProperty } satisfies FakeStyle },
    });

    applyLeftFraction(0.01);

    expect(setProperty).toHaveBeenCalledWith(
      SPLIT_LEFT_VARIABLE,
      String(MIN_LEFT_FRACTION),
    );
  });
});

describe("SPLIT_RESTORE_SCRIPT", () => {
  /**
   * Runs the inline script the way the browser would, with window and document
   * supplied as locals so the suite needs no DOM.
   */
  function runRestoreScript(stored: string | null): string[][] {
    const calls: string[][] = [];
    // noinspection JSUnusedGlobalSymbols
    const storage = {
      getItem: () => stored,
      setItem: () => undefined,
    };
    const documentStub = {
      documentElement: {
        style: {
          setProperty: (name: string, value: string) => {
            calls.push([name, value]);
          },
        },
      },
    };

    new Function("window", "document", SPLIT_RESTORE_SCRIPT)(
      { localStorage: storage },
      documentStub,
    );

    return calls;
  }

  it("applies a stored split before any bundle runs", () => {
    expect(runRestoreScript("0.3000")).toEqual([[SPLIT_LEFT_VARIABLE, "0.3"]]);
  });

  // Leaving the property unset lets the CSS fallback supply the default split,
  // so an untouched visitor never sees the panels move.
  it.each([null, "", "not-a-number", "Infinity"])(
    "leaves the property unset for %o",
    (stored) => {
      expect(runRestoreScript(stored)).toEqual([]);
    },
  );

  it.each([
    ["0.95", String(MAX_LEFT_FRACTION)],
    ["0.01", String(MIN_LEFT_FRACTION)],
  ])("clamps the stored value %s to %s", (stored, expected) => {
    expect(runRestoreScript(stored)).toEqual([[SPLIT_LEFT_VARIABLE, expected]]);
  });

  it("agrees with applyLeftFraction on the value it publishes", () => {
    const setProperty = vi.fn();
    vi.stubGlobal("document", {
      documentElement: { style: { setProperty } satisfies FakeStyle },
    });

    applyLeftFraction(parseLeftFraction("0.3712"));

    expect(runRestoreScript("0.3712")).toEqual([setProperty.mock.calls[0]]);
  });

  it("survives storage that denies access", () => {
    const calls: string[][] = [];

    expect(() =>
      new Function("window", "document", SPLIT_RESTORE_SCRIPT)(
        {
          get localStorage(): FakeStorage {
            throw new Error("access denied");
          },
        },
        {
          documentElement: {
            style: {
              setProperty: (name: string, value: string) => {
                calls.push([name, value]);
              },
            },
          },
        },
      ),
    ).not.toThrow();
    expect(calls).toEqual([]);
  });
});
