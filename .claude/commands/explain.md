Given the date $ARGUMENTS (format: YYYY-MM-DD), do the following:

If no date is provided, use today's date from the `currentDate` context variable.

1. Parse the date into year (YYYY), month (MM), and day (DD).
2. Read the solutions file at `data/solutions/YYYY/MM/DD.json`.
3. For each solution in the array, send the prompt below using the solution's `code` field, then write the result into that solution's `aiExplanation` field.
4. After processing all solutions, write the updated array back to the same file.

Prompt to run per solution:
```
explain the following code in a simple way, using a single paragraph. Use markdown formatting (bold, inline code, etc.) where appropriate:

${code}
```

Important:
- Preserve all other fields in each solution object exactly as they are.
- Write the final JSON with 2-space indentation.
- If the file does not exist, say so and stop.
