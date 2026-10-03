import {
  readArray,
  readDay,
  readFields,
  readMember,
  readOptionalMember,
  readOptionalNumber,
  readOptionalString,
  readString,
  readTimestamp,
} from "./json-fields";
import {
  Difficulty,
  SolutionStatus,
  type Problem,
  type Solution,
} from "./types";

/**
 * Validates the parsed contents of one `data/problems` file. `JSON.parse`
 * is untyped, so a well-formed file with the wrong shape, such as a
 * difficulty outside {@link Difficulty}, is rejected here instead of
 * passing for a typed {@link Problem}. Isomorphic and unguarded, so the CLI
 * scripts validate archive files the same way the server readers do.
 *
 * @param value The parsed JSON value.
 * @param path Where the value came from, such as its file path, for error
 *   messages.
 * @returns A freshly built problem holding only the known fields.
 * @throws {TypeError} When any field is missing or malformed.
 */
export function parseProblem(value: unknown, path: string): Problem {
  const fields = readFields(value, path);

  return {
    title: readString(fields, "title", path),
    difficulty: readMember(
      Object.values(Difficulty),
      fields,
      "difficulty",
      path,
    ),
    description: readString(fields, "description", path),
    link: readString(fields, "link", path),
    date: readDay(fields, "date", path),
  };
}

/**
 * Validates one submitted solution from a `data/solutions` file.
 *
 * @param value The parsed JSON value.
 * @param path Where the value sits in the file, for error messages.
 * @returns A freshly built solution holding only the known fields; optional
 *   fields absent from the file stay absent.
 * @throws {TypeError} When a required field is missing, or any field is
 *   malformed.
 */
function parseSolution(value: unknown, path: string): Solution {
  const fields = readFields(value, path);
  const aiExplanation = readOptionalString(fields, "aiExplanation", path);
  const notes = readOptionalString(fields, "notes", path);
  const status = readOptionalMember(
    Object.values(SolutionStatus),
    fields,
    "status",
    path,
  );
  const cpuUsage = readOptionalNumber(fields, "cpuUsage", path);
  const memoryUsage = readOptionalNumber(fields, "memoryUsage", path);

  return {
    author: readString(fields, "author", path),
    code: readString(fields, "code", path),
    language: readString(fields, "language", path),
    ...(aiExplanation === undefined ? {} : { aiExplanation }),
    ...(notes === undefined ? {} : { notes }),
    ...(status === undefined ? {} : { status }),
    ...(cpuUsage === undefined ? {} : { cpuUsage }),
    ...(memoryUsage === undefined ? {} : { memoryUsage }),
    date: readTimestamp(fields, "date", path),
  };
}

/**
 * Validates the parsed contents of one `data/solutions` file: an array of
 * submitted solutions, possibly empty when nothing was submitted that day.
 * Isomorphic and unguarded, like {@link parseProblem}.
 *
 * @param value The parsed JSON value.
 * @param path Where the value came from, such as its file path, for error
 *   messages.
 * @returns A fresh array of freshly built solutions, in file order.
 * @throws {TypeError} When the value is not an array, or any solution is
 *   missing a required field or holds a malformed one.
 */
export function parseSolutions(value: unknown, path: string): Solution[] {
  return readArray(value, path).map((solution, index) =>
    parseSolution(solution, `${path}[${index}]`),
  );
}
