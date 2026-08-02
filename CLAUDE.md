@AGENTS.md

- the `any` type is explicitly forbidden
- prefer `const` over `let` for variables that don't need to be reassigned
- no inline/anonymous object types: declare props, return shapes, and record value shapes as named interfaces (e.g. `DifficultyBadgeProps`, `LatestDailies`), exported when other modules need them
- fields taking one of a closed set of strings are string enums, not string-literal unions (e.g. `Difficulty`, `SolutionStatus` in `lib/types.ts`); enum values must match the strings stored in `data/` JSON so the committed archive keeps type-checking
- use enum members everywhere instead of raw strings — comparisons, styling maps, test fixtures
- type checking is maximally strict: `tsconfig.json` enables every strictness flag beyond `strict` (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noUnusedLocals`, ...) — never loosen these or work around them with assertions; handle the `undefined` cases they surface
- no inline `//` or block comments in source files; every `lib/` function carries a JSDoc block stating its purpose, `@param` inputs, and `@returns`/`@throws` outputs — rationale that used to live in comments belongs in JSDoc (for lib) or the READMEs (for scripts/config)
- exception: comments ARE acceptable in `*.test.ts` files when they describe what is actually being tested (fixture intent, why an assertion holds)
