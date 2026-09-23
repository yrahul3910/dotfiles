import { defineRule } from "@oxlint/plugins";

import { RETURN_GROUP, bodyVisitors } from "../shared/vertical-layout.ts";

import type { Context } from "@oxlint/plugins";
import type { Body, Layout } from "../shared/vertical-layout.ts";

type MessageId = "startOfBody" | "endOfBody" | "detachedMove" | "detachedDelete" | "repeated" | "stretched";
// "return" marks the gap above a `return` that follows two or more siblings, whose blank line no-unpadded-blocks
// requires.
type Region = { first: number; last: number; where: "opening" | "between" | "return" | "closing" };

const MAX_STRETCHED = 3;

/** Whether `body` is a short run of one-line simple statements that needs no internal blank line. */
function stretched(layout: Layout, { kind, statements }: Body): boolean {
  if (kind !== "function" && kind !== "control") return false;
  if (statements.length < 2 || statements.length > MAX_STRETCHED) return false;

  return statements.every((node) => node.loc.start.line === node.loc.end.line && layout.label(node) === null);
}

/**
 * Every gap of `body`, in source order: under the opening line, between each pair of siblings, and above the closing
 * brace.
 *
 * A gap spans from the line after one piece of code to the line before the next one's visual start, so a comment
 * attached to the next statement is outside it and a detached one is inside. An empty body with both braces is one
 * opening gap covering everything between them. A gap can be empty (`first > last`) when its neighbours touch.
 */
function regions(layout: Layout, body: Body): Region[] {
  const { statements, opener, closer } = body;
  const first = statements[0];
  const last = statements.at(-1);

  if (first === undefined || last === undefined) {
    return opener !== null && closer !== null ? [{ first: opener + 1, last: closer - 1, where: "opening" }] : [];
  }

  const gaps: Region[] = [];
  if (opener !== null) gaps.push({ first: opener + 1, last: layout.visualStart(first) - 1, where: "opening" });

  statements.forEach((node, index) => {
    const previous = statements[index - 1];
    if (previous === undefined) return;

    const where = node.type === "ReturnStatement" && index >= RETURN_GROUP ? "return" : "between";
    gaps.push({ first: previous.loc.end.line + 1, last: layout.visualStart(node) - 1, where });
  });

  if (closer !== null) gaps.push({ first: last.loc.end.line + 1, last: closer - 1, where: "closing" });
  return gaps;
}

/** Maximal runs of consecutive blank lines within `region`, as inclusive line pairs. */
function blankRuns(layout: Layout, region: Region): [number, number][] {
  const runs: [number, number][] = [];

  for (let line = region.first; line <= region.last; line++) {
    if (!layout.blank(line)) continue;

    const start = line;
    while (line + 1 <= region.last && layout.blank(line + 1)) line++;
    runs.push([start, line]);
  }

  return runs;
}

/** Message for a blank run that cuts a prose comment off from the code below it, or null. */
function detached(layout: Layout, body: Body, region: Region, start: number): MessageId | null {
  if (body.kind !== "function" && body.kind !== "control") return null;
  if (region.where === "closing" || !layout.proseComment(start - 1)) return null;

  let top = start - 1;
  while (layout.comment(top - 1)) top--;

  // A comment right under the previous statement needs the blank line above it instead.
  return region.where !== "opening" && top === region.first ? "detachedMove" : "detachedDelete";
}

/**
 * Excess blank lines in one gap of `body`, as `[line, messageId, count]` triples for the report.
 *
 * Each maximal run of blank lines yields at most one finding, checked in priority order: a run against the opening
 * line or the closing brace, then a run that detaches a comment from its code, then a repeated blank line, then a
 * blank line in a stretched short body. `line` is the blank line to delete (the second one, for a repeated run), and
 * `count` fills the message's `{{count}}`.
 */
function excess(layout: Layout, body: Body, region: Region): [number, MessageId, number][] {
  const found: [number, MessageId, number][] = [];

  for (const [start, end] of blankRuns(layout, region)) {
    const count = end - start + 1;
    const cut = detached(layout, body, region, start);

    if (region.where === "opening" && start === region.first) {
      found.push([start, "startOfBody", count]);
    } else if (region.where === "closing" && end === region.last) {
      found.push([start, "endOfBody", count]);
    } else if (cut !== null) {
      found.push([start, cut, count]);
    } else if (count > 1) {
      found.push([start + 1, "repeated", count]);
    } else if (region.where === "between" && stretched(layout, body)) {
      found.push([start, "stretched", body.statements.length]);
    }
  }

  return found;
}

function checkBody(context: Context, layout: Layout, body: Body): void {
  for (const region of regions(layout, body)) {
    for (const [line, messageId, count] of excess(layout, body, region)) {
      context.report({
        loc: { start: { line, column: 0 }, end: { line, column: 0 } },
        messageId,
        data: { count: String(count) },
      });
    }
  }
}

/**
 * Reject blank lines that separate nothing.
 *
 * Blank lines are for the reader's eye, so each one must mark a seam between groups of code. These are padding
 * instead: a blank line directly inside a body's opening or closing brace (or under a `case x:` line); a blank line
 * between a comment and the code it describes; two or more blank lines in a row anywhere in a body; and any blank
 * line in a function or control-flow block of at most three one-line simple statements, which reads as one group
 * however it is spaced (except the blank line above a `return` that follows two statements, which no-unpadded-blocks
 * requires). Each finding anchors on the blank line to delete (or, for a detached comment, to move above
 * the comment).
 */
export const noExcessPaddingRule = defineRule({
  meta: {
    type: "layout",
    docs: {
      description: "Reject blank lines that do not separate two groups of code.",
    },
    messages: {
      startOfBody: "Blank line at the start of a body; the first statement sits directly under its opening line.",
      endOfBody: "Blank line at the end of a body; the closing brace sits directly under the last statement.",
      detachedMove: "Blank line between a comment and the code it describes; move it above the comment.",
      detachedDelete:
        "Blank line between a comment and the code it describes; delete it so the comment sits on its code.",
      repeated: "{{count}} blank lines in a row; one blank line separates groups.",
      stretched: "Unnecessary blank line; a body of {{count}} one-line statements reads as one group.",
    },
  },
  createOnce(context) {
    return bodyVisitors(context, (layout, body) => checkBody(context, layout, body));
  },
});
