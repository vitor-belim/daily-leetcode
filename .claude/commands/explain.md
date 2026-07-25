Given one or more dates in $ARGUMENTS (space-separated, format: YYYY-MM-DD each), do the following:

If no date is provided, use today's date from the `currentDate` context variable.

For each date, independently:
1. Parse the date into year (YYYY), month (MM), and day (DD).
2. Read the solutions file at `data/solutions/YYYY/MM/DD.json`. If the file does not exist, say so and move on to the next date.
3. Run through each solution in the array, sending the prompt below using the solution's `code` field, and then writing the result into that solution's `aiExplanation` field.
4. After processing all solutions for that date, write the updated array back to that date's file.

Prompt to run per solution:
```
explain the following code in a simple way, using a single paragraph. Use markdown formatting (bold, inline code, etc.) where appropriate:
${code}
```

### Important:
- Process every date given, even if one date's file is missing.
- Preserve all other fields in each solution object exactly as they are.
- Write each file's final JSON with 2-space indentation.
