Given a date in $ARGUMENTS (format: YYYY-MM-DD), do the following:

If no date is provided, use today's date from the `currentDate` context variable.

1. Parse the date into year (YYYY), month (MM), and day (DD).
2. Read the solution file at `data/solutions/YYYY/MM/DD.json`. If the file does not exist, say so and stop.
3. Run through each solution in the array, sending the prompt below using the solution's `code` field, and then writing the result into that solution's `aiExplanation` field.
4. After processing all solutions, write the updated array back to the file.

Prompt to run per solution:
```
explain the following code in a simple way, using a single paragraph. Use markdown formatting (bold, inline code, etc.) where appropriate:
${code}
```

### Important:
- Preserve all other fields in each solution object exactly as they are.
- Write the file's final JSON with 2-space indentation.
- The explanation text may reference code containing double quotes (e.g. string literals or object keys). Ensure the file you write is valid JSON — escape any `"` characters inside `aiExplanation` (as `\"`) so the string doesn't break out early.
