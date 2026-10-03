/**
 * Tells whether a failed filesystem call failed only because the file does
 * not exist. Readers use it to treat a missing archive file as an expected
 * miss while letting every other failure (malformed JSON, `EACCES`,
 * `EISDIR`, ...) propagate to an error boundary or fail the build.
 *
 * @param error The value caught from the failed call.
 * @returns True for an `ENOENT` filesystem error, false for anything else.
 */
export function isMissingFileError(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
