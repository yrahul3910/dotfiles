import { defineRule } from "@oxlint/plugins";
import type { ESTree } from "@oxlint/plugins";

import { lineLength } from "../shared/line-length.ts";
import { proseWrapLines } from "../shared/prose-wraps.ts";

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
    let reported = new Set<number>();
    let limit = 120;
    let margin = 20;

    function check(node: ESTree.Node) {
      const source = context.sourceCode;
      const tokens = source.getTokens(node);
      if (tokens.length === 0) return;

      // Braced data and block bodies have meaningful structure; template and JSX newlines can affect rendered content.
      if (tokens.some((token) => ["{", "}", "=>"].includes(token.value)) && node.type !== "ImportDeclaration") return;
      if (tokens.some((token) => token.loc.start.line !== token.loc.end.line)) return;
      if (source.getCommentsInside(node).length > 0) return;

      const start = node.loc.start.line;
      const end = node.loc.end.line;
      if (start === end) return;

      const lines = source.lines.slice(start - 1, end);
      if (lines.some((line) => !line.trim())) return;

      const joined = [lines[0].trimEnd(), ...lines.slice(1).map((line) => line.trim())].join(" ");
      if (joined.replaceAll("\t", "        ").length > limit - margin) return;
      if (reported.has(start + 1)) return;

      reported.add(start + 1);
      context.report({
        loc: { start: { line: start + 1, column: 0 }, end: { line: end, column: node.loc.end.column } },
        messageId: "pseudoWrap",
        data: { limit: String(limit), margin: String(margin) },
      });
    }

    return {
      Program() {
        reported = new Set();

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
          for (const offset of proseWrapLines(lines, limit, margin)) {
            const line = group.start + offset;
            reported.add(line);
            context.report({
              loc: { start: { line, column: 0 }, end: { line, column: source.lines[line - 1].length } },
              messageId: "pseudoWrap",
              data: { limit: String(limit), margin: String(margin) },
            });
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
