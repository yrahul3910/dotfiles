const STRUCTURAL_LINE = /^(?:[-*+]\s|\d+[.)]\s|[@:#>|]|```|~~~|[=-]{3,}|[A-Za-z][A-Za-z /-]*:{1,2}$)/;

/** An inclusive range of 0-based line offsets within a comment block. */
export interface Paragraph {
  first: number;
  last: number;
}

/**
 * Find the paragraphs in one comment block that wrap early, as offsets into `lines`.
 *
 * `lines` are the raw source lines of a JSDoc block or a run of line comments; comment markers are stripped before
 * reading them. A paragraph is a run of lines that join as prose: a blank, indented, fenced, or structural line (list
 * item, tag, heading, table row) ends it. It wraps early when one of its lines is at most `limit - margin` columns wide
 * (tabs count as 8) while the next line's first word would still fit within `limit`. Each such paragraph is returned
 * once, spanning all of its lines, in source order.
 */
export function earlyWrappedParagraphs(lines: string[], limit: number, margin: number): Paragraph[] {
  const paragraphs: (Paragraph & { early: boolean })[] = [];
  let fenced = false;

  // Strip the closer first, so a lone ` */` line is empty rather than a stray `/` that reads as the next word.
  const content = lines.map((line) => line.replace(/\*\/\s*$/, "").replace(/^\s*(?:\/\*\*?|\/\/|\*) ?/, ""));

  for (let index = 0; index + 1 < lines.length; index++) {
    const current = content[index];
    const next = content[index + 1];

    if (/^\s*(```|~~~)/.test(current)) fenced = !fenced;
    if (fenced || !current.trim() || !next.trim()) continue;
    if (/^\s/.test(current) || /^\s/.test(next)) continue;
    if (STRUCTURAL_LINE.test(current) || STRUCTURAL_LINE.test(next)) continue;

    const width = lines[index].trimEnd().replaceAll("\t", "        ").length;
    const nextWord = next.trim().split(/\s+/, 1)[0];
    const fits = width <= limit - margin && width + 1 + nextWord.length <= limit;
    const early = fits && /[a-zA-Z].*\s+[a-zA-Z]/.test(current);
    const previous = paragraphs.at(-1);

    if (previous?.last === index) {
      previous.last = index + 1;
      previous.early ||= early;
    } else {
      paragraphs.push({ first: index, last: index + 1, early });
    }
  }

  return paragraphs.filter(({ early }) => early).map(({ first, last }) => ({ first, last }));
}
