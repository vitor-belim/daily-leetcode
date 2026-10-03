import { isValidCalendarDate } from "./dates";

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Reads an untrusted JSON value as an array. Isomorphic, like every reader
 * here, so the browser validating a route handler's response and the server
 * validating an archive file reject bad shapes the same way.
 *
 * @param value The value to read.
 * @param path Where the value sits in the payload, for error messages.
 * @returns The array's items, still unvalidated.
 * @throws {TypeError} When the value is not an array.
 */
export function readArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new TypeError(`${path} is not an array`);
  }
  return value;
}

/**
 * Reads an untrusted JSON value as an object's fields.
 *
 * @param value The value to read.
 * @param path Where the value sits in the payload, for error messages.
 * @returns The object's own fields by name.
 * @throws {TypeError} When the value is not a non-array object.
 */
export function readFields(value: unknown, path: string): Map<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError(`${path} is not an object`);
  }
  return new Map(Object.entries(value));
}

/**
 * Reads a required string field.
 *
 * @param fields The object's fields.
 * @param key The field name.
 * @param path Where the object sits in the payload, for error messages.
 * @returns The string.
 * @throws {TypeError} When the field is missing or not a string.
 */
export function readString(
  fields: Map<string, unknown>,
  key: string,
  path: string,
): string {
  const value = fields.get(key);
  if (typeof value !== "string") {
    throw new TypeError(`${path}.${key} is not a string`);
  }
  return value;
}

/**
 * Reads an optional string field.
 *
 * @param fields The object's fields.
 * @param key The field name.
 * @param path Where the object sits in the payload, for error messages.
 * @returns The string, or undefined when the field is absent.
 * @throws {TypeError} When the field is present but not a string.
 */
export function readOptionalString(
  fields: Map<string, unknown>,
  key: string,
  path: string,
): string | undefined {
  return fields.has(key) ? readString(fields, key, path) : undefined;
}

/**
 * Reads a required boolean field.
 *
 * @param fields The object's fields.
 * @param key The field name.
 * @param path Where the object sits in the payload, for error messages.
 * @returns The boolean.
 * @throws {TypeError} When the field is missing or not a boolean.
 */
export function readBoolean(
  fields: Map<string, unknown>,
  key: string,
  path: string,
): boolean {
  const value = fields.get(key);
  if (typeof value !== "boolean") {
    throw new TypeError(`${path}.${key} is not a boolean`);
  }
  return value;
}

/**
 * Reads a required finite number field.
 *
 * @param fields The object's fields.
 * @param key The field name.
 * @param path Where the object sits in the payload, for error messages.
 * @returns The number.
 * @throws {TypeError} When the field is missing or not a finite number.
 */
export function readNumber(
  fields: Map<string, unknown>,
  key: string,
  path: string,
): number {
  const value = fields.get(key);
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${path}.${key} is not a number`);
  }
  return value;
}

/**
 * Reads an optional finite number field.
 *
 * @param fields The object's fields.
 * @param key The field name.
 * @param path Where the object sits in the payload, for error messages.
 * @returns The number, or undefined when the field is absent.
 * @throws {TypeError} When the field is present but not a finite number.
 */
export function readOptionalNumber(
  fields: Map<string, unknown>,
  key: string,
  path: string,
): number | undefined {
  return fields.has(key) ? readNumber(fields, key, path) : undefined;
}

/**
 * Reads a field holding a finite number or null.
 *
 * @param fields The object's fields.
 * @param key The field name.
 * @param path Where the object sits in the payload, for error messages.
 * @returns The number, or null.
 * @throws {TypeError} When the field is missing or neither null nor a
 *   finite number.
 */
export function readNullableNumber(
  fields: Map<string, unknown>,
  key: string,
  path: string,
): number | null {
  const value = fields.get(key);
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${path}.${key} is not a number or null`);
  }
  return value;
}

/**
 * Reads a field holding a non-negative whole number, such as a count.
 *
 * @param fields The object's fields.
 * @param key The field name.
 * @param path Where the object sits in the payload, for error messages.
 * @returns The count.
 * @throws {TypeError} When the field is missing or not a non-negative
 *   integer.
 */
export function readCount(
  fields: Map<string, unknown>,
  key: string,
  path: string,
): number {
  const value = fields.get(key);
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new TypeError(`${path}.${key} is not a non-negative integer`);
  }
  return value;
}

/**
 * Reads a field holding a non-negative whole number or null.
 *
 * @param fields The object's fields.
 * @param key The field name.
 * @param path Where the object sits in the payload, for error messages.
 * @returns The count, or null.
 * @throws {TypeError} When the field is missing or neither null nor a
 *   non-negative integer.
 */
export function readNullableCount(
  fields: Map<string, unknown>,
  key: string,
  path: string,
): number | null {
  return fields.get(key) === null ? null : readCount(fields, key, path);
}

/**
 * Reads a field holding an array of strings.
 *
 * @param fields The object's fields.
 * @param key The field name.
 * @param path Where the object sits in the payload, for error messages.
 * @returns A copy of the strings.
 * @throws {TypeError} When the field is missing, not an array, or holds a
 *   non-string.
 */
export function readStringArray(
  fields: Map<string, unknown>,
  key: string,
  path: string,
): string[] {
  return readArray(fields.get(key), `${path}.${key}`).map((item, index) => {
    if (typeof item !== "string") {
      throw new TypeError(`${path}.${key}[${index}] is not a string`);
    }
    return item;
  });
}

/**
 * Reads a field holding one member of a string enum, so values that the
 * enum doesn't declare are rejected instead of slipping through as strings.
 *
 * @param members Every member of the enum, e.g. `Object.values(Difficulty)`.
 * @param fields The object's fields.
 * @param key The field name.
 * @param path Where the object sits in the payload, for error messages.
 * @returns The matching enum member.
 * @throws {TypeError} When the field is missing or matches no member.
 */
export function readMember<T>(
  members: readonly T[],
  fields: Map<string, unknown>,
  key: string,
  path: string,
): T {
  const value = fields.get(key);
  const member = members.find((candidate) => candidate === value);
  if (member === undefined) {
    throw new TypeError(`${path}.${key} is not one of ${members.join(", ")}`);
  }
  return member;
}

/**
 * Reads an optional field holding one member of a string enum.
 *
 * @param members Every member of the enum, e.g. `Object.values(Difficulty)`.
 * @param fields The object's fields.
 * @param key The field name.
 * @param path Where the object sits in the payload, for error messages.
 * @returns The matching enum member, or undefined when the field is absent.
 * @throws {TypeError} When the field is present but matches no member.
 */
export function readOptionalMember<T>(
  members: readonly T[],
  fields: Map<string, unknown>,
  key: string,
  path: string,
): T | undefined {
  return fields.has(key) ? readMember(members, fields, key, path) : undefined;
}

/**
 * Reads a field holding a real `YYYY-MM-DD` calendar day.
 *
 * @param fields The object's fields.
 * @param key The field name.
 * @param path Where the object sits in the payload, for error messages.
 * @returns The day.
 * @throws {TypeError} When the field is missing, not zero-padded
 *   `YYYY-MM-DD`, or not a real calendar date.
 */
export function readDay(
  fields: Map<string, unknown>,
  key: string,
  path: string,
): string {
  const value = readString(fields, key, path);
  if (!DAY.test(value) || !isValidCalendarDate(value)) {
    throw new TypeError(`${path}.${key} is not a YYYY-MM-DD day`);
  }
  return value;
}

/**
 * Reads a field holding a timestamp that `Date` can parse, such as an ISO
 * string.
 *
 * @param fields The object's fields.
 * @param key The field name.
 * @param path Where the object sits in the payload, for error messages.
 * @returns The timestamp string, unchanged.
 * @throws {TypeError} When the field is missing, not a string, or not a
 *   parseable date.
 */
export function readTimestamp(
  fields: Map<string, unknown>,
  key: string,
  path: string,
): string {
  const value = readString(fields, key, path);
  if (Number.isNaN(Date.parse(value))) {
    throw new TypeError(`${path}.${key} is not a timestamp`);
  }
  return value;
}
