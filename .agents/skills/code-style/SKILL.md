---
name: code-style
description: Review, write, and edit non-trivial code using the project's conventions and these code style rules. Read the applicable language reference. For read-only reviews, report findings without edits; run change-verification checks after editing.
---

# Code style

You are expected to write code at the level of a senior engineer who cares about the codebase. Optimize for the person who reads this code next, not for finishing the diff.

Language-specific rules live in `references/<language>.md`. If a file exists for the language you're reviewing or editing, read it too. For a read-only review, use these rules to identify concrete issues; the formatting and change-verification steps below apply after edits, not as prerequisites to reviewing.

## Fit in before you stand out

- **Read the surrounding code first.** Match its naming, structure, error handling, logging, and idioms. Local consistency beats any external "best practice." When in Rome.
- **Follow the project's rules.** If a style guide, `CONTRIBUTING.md`, `.editorconfig`, `biome.json`, `rustfmt.toml`, `pyproject.toml`, etc. exists, obey it. Run the formatter and linter before declaring done; don't hand back code that fails them.
- **Use the repo's established way of doing things.** If there's already a pattern for config, HTTP calls, dates, validation, or DI, use it. Introducing a second way to do the same thing is a regression even if your way is "nicer."

However: if there is a nicer way and the effort to change it is not significant, it's worth bringing it up to the user.

## Don't reinvent or duplicate

- **Search before you write.** Before adding a helper, grep for an existing one. Most "utility" functions you're about to write already exist somewhere in the repo or its dependencies.
- **Rule of Three.** Copying once is fine. The third occurrence earns an abstraction. When you extract, generalize it properly--a shared helper with a special-case flag bolted on is worse than two copies.
- **Don't add a dependency** for something the standard library or an existing dependency already does well.
- **Don't reimplement the language or framework.** Reach for the built-in before the hand-rolled loop.

## Earn every abstraction

- **Don't extract a function that's used once** unless it names a genuinely non-obvious step or removes deep nesting. A one-shot helper usually just adds a layer to chase.
- **No pass-through one-liners.** A function that only renames or forwards to another function should be inlined and deleted.
- **A function justifies itself** by one of: reuse, a name that documents non-obvious intent, or a real testing/composition seam. "It's more granular" is not a justification.
- **YAGNI.** No parameters, options, config hooks, or interfaces added "in case we need them later." Build for what's in front of you; generalize when the second real caller appears.

## Be honest with the tools

- **Avoid silencing the type checker or linter to make an error go away.** No `# noqa`, `# type: ignore`, `@ts-ignore`, `// biome-ignore`, blanket `any`, gratuitous casts, or `!` non-null assertions used as escape hatches unless necessary or fixing it would need hacks or workarounds. Fix the root cause.
- A suppression is acceptable only when the tool is genuinely wrong, it is **narrowly scoped to the single line**, and it carries a comment explaining *why*. This should be rare.
- **Don't weaken types to compile.** Loosening a type to `any`/`object`/`unknown` to get past an error is hiding a bug, not fixing one.
- **Don't make tests pass by deleting, skipping, or weakening them.** If a test is genuinely wrong, say so and explain--don't quietly gut it.

## Code shape smells

- **Data clumps**: always passing `(userId, orgId, accountId)` together → make a struct. Same for `(start, end)`, `(x, y)`, `(key, value)`.
- Code clumps: separate logical blocks of code with a blank line.
- Don't return different shapes from one function (sometimes a list, sometimes a single item, sometimes `null`). Pick one, or expose two functions.
- Rely on invariants in the code. If an argument is typed `usize`, there is no need for a `if (arg < 0)`. If an argument is typed as an `int`, don't "make sure", believe it, and let the type checker bring up issues. If a function is called after some invariants are checked, don't recheck inside the function. Either avoid the pre-call check, or remove it from the function and document that invariant in the function's docstring.
- For the items in this section, if the current code has these smells, follow the current code style, but bring up the possible refactor to the user if your own code has to use these smells.

## Comments

- **No decorative separators or banners** (`# -------- Section --------`, ASCII art headers). Well-structured code is navigable without them; if a file needs visual dividers, it needs splitting.
- **Comments explain *why*, not *what*.** Don't narrate code that already says what it does. Explain the non-obvious: a tricky invariant, a workaround, a reason for an unusual choice.
- **Match the tone of the codebase.** Read a few existing comments before writing your own. If this codebase's comments are whimsical or full of references, write in that register; if they are strictly design-and-algorithm notes, keep yours dry and technical. Don't impose your own voice on a codebase that has one.
- **Don't reference the pre-refactor state.** Write changed code as if the current version is the only one that ever existed. No "old schema", "previously now uses", "changed from X", "formerly". The reader has no access to what was there before and no reason to care; that context lives in git, not the source.
- **Don't narrate the change as a contrast.** When you edit code (including fixing code the user just wrote and asked you to review), don't describe the result by pointing at what it replaced: no "instead of X", "rather than the previous Y", "changed to use Z". The reader sees only the current code; contrasting it against a version they never saw is noise. This is distinct from a genuine rationale comment: "we avoid X here because it deadlocks under load" earns its place when the choice is non-obvious and a reader would plausibly reach for X. The test: does the comment explain a live decision the next reader faces, or just recount the diff? Keep the former, cut the latter.
- **No changelog comments** (`// added X`, `// fixed bug`). Git records history.
- **Delete commented-out code.** It's dead weight; git remembers it.
- No comment that just paraphrases the function name. The name is the comment. Either write a real docstring, or don't write one at all.
- **A one-line docstring on a non-trivial function is a caption, not documentation.** If the function runs longer than about twenty lines, raises or throws in more than one place, or returns something the name does not fully explain, one sentence cannot state the contract. Write the summary line, a blank line, then what callers get back, what is guaranteed, and how it fails. "Resolve overrides using the project's own installation" above a function that returns a column limit and throws in three places tells the next reader nothing they can rely on. `no-sloppy` (SLOP013) and `no-slop-ts` (`anti-slop/no-thin-jsdoc`) warn on this.

### Docstrings and API documentation

The most important stylistic guides when writing docs are that they MUST be natural and provide sufficient details for readers. You should assume that the docs will be read by future *human* maintainers, and in the case of APIs/library functions, through their LSP (such as when they hover over the symbol in their editor). Unless you are in the rare circumstance that the surrounding code has the same tone and/or you are writing code where the problem requires it for some reason, you should NEVER write docs that have a sterile feeling. Function/class/etc. docs are *not* the place to write prose that sounds like it's from a technical report. There is literally no reason to optimize for brevity.

- Open with the operation or purpose. Imperative mood is appropriate only within the opening line or sentence, whichever is longer. The opening line/sentence does not *need* to be in the imperative mood unless the linter mandates it. After that, make responsibility explicit. "The current conversation remains active if saving fails" states a guarantee provided by the function. "Callers should keep the current conversation active if saving fails" or "You should keep the current conversation active if saving fails" gives caller guidance. Both belong in documentation when accurate; a bare "Keep the current conversation active" leaves the reader guessing who is responsible.
- Put referenced code identifiers in backticks, including arguments, variables, fields, functions, and types. Use documentation links when they help readers navigate to a referenced declaration.
- Describe what callers can rely on: units, boundaries, ordering, mutation, failure outcomes, and relevant constraints. Distinguish returned data from side effects. These are possible topics, not a mandatory checklist for every function.
- Connect non-obvious choices to their reasons or consequences. A small example is useful when it resolves ambiguity; a walkthrough of the implementation usually is not.
- Give nontrivial private helpers the same care as public APIs when their contracts are subtle. Let detail follow complexity, without mandatory sections, repeated type information, or padding.
- Descriptive prose need not be stiff or impersonal. Direct address such as "you should" is welcome when it makes caller guidance clearer. Keep the wording natural while distinguishing advice, requirements, and guarantees.

For example, a file-writing function could explain its failure guarantee without narrating each filesystem call:

> Atomically replace `path` with the JSON representation of `value`.
>
> A temporary file in the same directory keeps the previous destination intact if writing fails. Readers see either the old file or the complete replacement.

## Characters and punctuation

- **Plain ASCII in code, comments, commit messages, and output.** No emojis and no Unicode decoration.
- **Don't use the em-dash character.** Use `-`, or `--` where an em-dash genuinely reads better, and let the editor's font and ligatures handle rendering. Follow the Chicago Manual of Style: no spaces around the double-hyphen em-dash substitute.
- **No other "smart" punctuation** either: use straight quotes, `...` for an ellipsis, and plain hyphens. Let tooling render glyphs; don't paste them in.

## Naming

- Names reveal intent and match the codebase's conventions and casing.
- Avoid abbreviations unless they're already standard in this repo or domain.
- A name that needs a comment to explain what it holds is the wrong name.
- Booleans read as yes/no questions: `isActive`, `hasAccess`, `canEdit`--not `activeFlag`, `access`, `edit`.

## Taste: make special cases disappear

This is the part that separates competent from good.

- **Restructure to eliminate edge cases, don't pile on branches to handle them.** The mark of taste is the special case that vanishes after you pick the right data structure or formulation--not the function that grows another `if` for every input.
- **Get the data model right and the code follows.** Most ugly code is a symptom of the wrong data structure. Fix that first.
- **Make illegal states unrepresentable.** Prefer types/structures where the bad case can't be constructed over runtime checks that hope to catch it.
- **Reduce nesting.** Guard clauses and early returns over deep `if`/`else` pyramids.

## Stay in scope

- **Do what was asked--and the cleanup it directly requires--but don't gold-plate.** Don't refactor unrelated code, rename things wholesale, or "while I'm here" your way into a sprawling diff.
- **Keep diffs surgical.** A reviewer should be able to see exactly what changed and why. Smaller, focused changes over large opportunistic ones.
- **Leave it at least as clean as you found it**, but separate genuine drive-by improvements from the task and call them out rather than burying them.

## Errors and edges

- **Match the repo's error strategy** (exceptions vs. result types vs. error returns). Don't introduce a competing one.
- **Don't swallow errors.** No empty `catch`, no catch-log-continue that hides failure. Fail where failure is meaningful and let callers decide.
- **Handle the real edge cases** (empty, null, boundary, concurrent)--but via structure where possible (see taste), not a thicket of defensive checks.

## Before you call it done

- Verify proportionally to the risk: formatter + linter on changed files and a
  typecheck/build of the affected package, always. Behavior changes also get
  the tests covering the changed behavior, run narrowly (`cargo test -p ...`,
  `pytest ... -k ...`). The full suite only for cross-cutting changes or when
  asked.
- Report honestly: if something fails or you skipped a step, say so with the output--don't claim green when it's not.
- Re-read your own diff as a reviewer would. If anything in it would make *you* leave a comment, fix it first.
