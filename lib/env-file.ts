import fs from "fs";

/**
 * Reports whether a line assigns a given variable.
 *
 * The name is compared structurally rather than by pattern, so names containing regex
 * metacharacters cannot match an unrelated line.
 *
 * @param line One line of an env file.
 * @param name The variable name to look for.
 * @returns True when the line is an assignment to exactly that name.
 */
function assignsName(line: string, name: string): boolean {
  const separator = line.indexOf("=");
  return separator !== -1 && line.slice(0, separator).trim() === name;
}

/**
 * Rewrites `NAME=value` assignments in an env file in place.
 *
 * Lines that are not being updated — comments, blank lines, unrelated keys — are preserved
 * exactly, and names that are absent are appended.
 *
 * @param file Path to the env file, created when it does not exist.
 * @param values The variable names to write, mapped to their new values.
 * @throws When the file exists but cannot be read or written.
 */
export function updateEnvFile(
  file: string,
  values: ReadonlyMap<string, string>,
): void {
  const existing = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  const trimmed = existing.replace(/\n+$/, "");
  const lines = trimmed.length > 0 ? trimmed.split("\n") : [];
  for (const [name, value] of values) {
    const index = lines.findIndex((line) => assignsName(line, name));
    if (index === -1) {
      lines.push(`${name}=${value}`);
    } else {
      lines[index] = `${name}=${value}`;
    }
  }
  fs.writeFileSync(file, `${lines.join("\n")}\n`);
}
