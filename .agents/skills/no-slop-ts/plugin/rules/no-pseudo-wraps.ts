import { defineRule } from "@oxlint/plugins";
import type { ESTree } from "@oxlint/plugins";

import { lineLength } from "../shared/line-length.ts";
import { earlyWrappedParagraphs } from "../shared/prose-wraps.ts";

type WrapOptions = {
  /** Override the project's discovered column limit. Omit to use discovery, then fallbackLineLength. */
  maxLineLength?: number;

  /** Column limit when neither maxLineLength nor a project limit is set. Defaults to 120. */
  fallbackLineLength?: number;

  /** Flag wraps at least this many columns below the limit. Defaults to 20; a limit of 120 means a cutoff of 100. */
  margin?: number;
};

function isWrapOptions(value: unknown): value is WrapOptions {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Whether `node` is an inner link of a larger chain that is laid out as one unit: an operand of a binary or logical
 * expression, a part of a ternary, or a call whose result is the object of the next call in a member chain.
 *
 * Only the outermost node of such a chain is measured. A chain too long for one line may break once per operand or
 * per call; joining just its first two links would leave it half-wrapped, so the inner links never count on their own.
 * Parentheses are looked through, so `(a || b) && c` is one chain.
 */
function isChainLink(node: ESTree.Node): boolean {
  let child: ESTree.Node = node;
  let parent = node.parent;

  while (parent?.type === "ParenthesizedExpression") {
    child = parent;
    parent = parent.parent;
  }

  switch (parent?.type) {
    case "BinaryExpression":
    case "LogicalExpression":
    case "ConditionalExpression":
      return true;
    case "MemberExpression":
      return parent.object === child && parent.parent?.type === "CallExpression" && parent.parent.callee === parent;
    default:
      return false;
  }
}

export const noPseudoWrapsRule = defineRule({
  meta: {
    type: "layout",
    docs: { description: "Reject premature wrapping in code, doc comments, and prose comments." },
    messages: { pseudoWrap: "Unnecessary wrap at least {{margin}} columns below the {{limit}}-column limit." },
    schema: [
      {
        type: "object",
        properties: {
          maxLineLength: { type: "integer", minimum: 1 },
          fallbackLineLength: { type: "integer", minimum: 1 },
          margin: { type: "integer", minimum: 0 },
        },
        additionalProperties: false,
      },
    ],
  },
  createOnce(context) {
    // Line spans already reported, so a statement and the call inside it make one finding.
    let reported: [number, number][] = [];
    let limit = 120;
    let margin = 20;

    function report(start: number, end: number, endColumn: number) {
      reported.push([start, end]);
      context.report({
        loc: { start: { line: start, column: 0 }, end: { line: end, column: endColumn } },
        messageId: "pseudoWrap",
        data: { limit: String(limit), margin: String(margin) },
      });
    }

    function check(node: ESTree.Node) {
      const source = context.sourceCode;
      const tokens = source.getTokens(node);
      if (tokens.length === 0 || isChainLink(node)) return;

      // Braced data and block bodies have meaningful structure; template and JSX newlines can affect rendered content.
      if (tokens.some((token) => ["{", "}", "=>"].includes(token.value)) && node.type !== "ImportDeclaration") return;
      if (tokens.some((token) => token.loc.start.line !== token.loc.end.line)) return;

      const start = node.loc.start.line;
      const end = node.loc.end.line;
      if (start === end || reported.some(([first, last]) => first <= start && end <= last)) return;

      // Joining moves a lone one-line comment on the first or last line to the end; any other comment would be lost.
      const comments = source.getCommentsInside(node);
      const oneLine = comments.every(({ loc }) => loc.start.line === loc.end.line);
      const atEnds = comments.every(({ loc }) => loc.start.line === start || loc.start.line === end);
      if (comments.length > 1 || !oneLine || !atEnds) return;

      const lines = source.lines.slice(start - 1, end);
      if (lines.some((line) => !line.trim())) return;

      const joined = [lines[0].trimEnd(), ...lines.slice(1).map((line) => line.trim())].join(" ");
      if (joined.replaceAll("\t", "        ").length > limit - margin) return;

      report(start, end, node.loc.end.column);
    }

    return {
      Program() {
        reported = [];

        const option = context.options[0];
        const settings = isWrapOptions(option) ? option : {};
        limit = settings.maxLineLength ?? lineLength(context.filename) ?? settings.fallbackLineLength ?? 120;
        margin = settings.margin ?? 20;

        const source = context.sourceCode;
        const groups: { start: number; end: number }[] = [];

        for (const comment of source.getAllComments()) {
          const start = comment.loc.start.line;
          const end = comment.loc.end.line;
          if (source.lines[start - 1].slice(0, comment.loc.start.column).trim()) continue;

          const previous = groups.at(-1);

          if (comment.type === "Line" && previous?.end === start - 1) previous.end = end;
          else groups.push({ start, end });
        }

        for (const group of groups) {
          const lines = source.lines.slice(group.start - 1, group.end);

          for (const { first, last } of earlyWrappedParagraphs(lines, limit, margin)) {
            const line = group.start + last;
            report(group.start + first, line, source.lines[line - 1].length);
          }
        }
      },
      VariableDeclaration: check,
      ExpressionStatement: check,
      ReturnStatement: check,
      ThrowStatement: check,
      ImportDeclaration: check,
      CallExpression: check,
      NewExpression: check,
      BinaryExpression: check,
      LogicalExpression: check,
      ConditionalExpression: check,
    };
  },
});
