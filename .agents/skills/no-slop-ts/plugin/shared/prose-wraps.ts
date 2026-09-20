const STRUCTURAL_LINE = /^(?:[-*+]\s|\d+[.)]\s|[@:#>|]|```|~~~|[=-]{3,}|[A-Za-z][A-Za-z /-]*:{1,2}$)/;

/** Report paragraph continuations that leave room for another word well below the allowed width. */
export function proseWrapLines(lines: string[], limit: number, margin: number): number[] {
  const findings: number[] = [];
  let fenced = false;

  const content = lines.map((line) => line.replace(/^\s*(?:\/\*\*?|\/\/|\*) ?/, "").replace(/\*\/\s*$/, ""));
  for (let index = 0; index + 1 < lines.length; index++) {
    const current = content[index];
    const next = content[index + 1];

    if (/^\s*(```|~~~)/.test(current)) fenced = !fenced;
    if (fenced || !current.trim() || !next.trim()) continue;
    if (/^\s/.test(current) || /^\s/.test(next)) continue;
    if (STRUCTURAL_LINE.test(current) || STRUCTURAL_LINE.test(next)) continue;
    if (!/[a-zA-Z].*\s+[a-zA-Z]/.test(current)) continue;

    const width = lines[index].trimEnd().replaceAll("\t", "        ").length;
    const nextWord = next.trim().split(/\s+/, 1)[0];
    if (width <= limit - margin && width + 1 + nextWord.length <= limit) findings.push(index + 1);
  }

  return findings;
}
