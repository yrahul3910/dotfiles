import { defineRule } from "@oxlint/plugins";

import { bodyVisitors } from "../shared/vertical-layout.ts";

import type { Context, ESTree } from "@oxlint/plugins";
import type { Body, Layout } from "../shared/vertical-layout.ts";

const MAX_RUN = 8;

/** Identifier at the root of a call or member chain: `parser` for `parser.add(...)`, `this` for `this.x()`. */
function root(node: ESTree.Node): string | null {
  switch (node.type) {
    case "Identifier":
      return node.name;
    case "ThisExpression":
      return "this";
    case "MemberExpression":
      return root(node.object);
    case "CallExpression":
      return root(node.callee);
    case "AwaitExpression":
      return root(node.argument);
    default:
      return null;
  }
}

/**
 * The uniform family `node` belongs to, or null when it belongs to none.
 *
 * Imports and re-exports are `import`; declarations, type aliases, class fields, and assignment statements are
 * `assign`; a call statement (awaited or not) is `call:<root>`, keyed by the root of its callee chain so that
 * `expect(a).toBe(1)` and `expect(b).toEqual(2)` share a family. Export wrappers are looked through. A run whose
 * statements all share one non-null family is exempt from the rule.
 */
function family(node: ESTree.Node): string | null {
  switch (node.type) {
    case "ImportDeclaration":
    case "ExportAllDeclaration":
      return "import";
    case "VariableDeclaration":
    case "TSTypeAliasDeclaration":
    case "PropertyDefinition":
      return "assign";
    case "ExportNamedDeclaration":
      return node.declaration === null ? "import" : family(node.declaration);
    case "ExpressionStatement": {
      const { expression } = node;
      if (expression.type === "AssignmentExpression") return "assign";

      const name = expression.type === "CallExpression" || expression.type === "AwaitExpression" ? root(expression) : null;
      return name === null ? null : `call:${name}`;
    }
    default:
      return null;
  }
}

function report(context: Context, layout: Layout, run: readonly ESTree.Node[]): void {
  const families = new Set(run.map(family));
  const crossing = run[MAX_RUN];
  if (crossing === undefined || (families.size === 1 && !families.has(null))) return;

  const line = layout.visualStart(crossing);
  const text = layout.lines[line - 1] ?? "";
  context.report({
    loc: { start: { line, column: text.length - text.trimStart().length }, end: { line, column: text.length } },
    messageId: "denseRun",
    data: { count: String(run.length) },
  });
}

function checkBody(context: Context, layout: Layout, { statements }: Body): void {
  let run: ESTree.Node[] = [];

  for (const node of statements) {
    const previous = run.at(-1);

    if (layout.isBlock(node) || (previous !== undefined && layout.separated(previous, node))) {
      report(context, layout, run);
      run = [];
    }

    if (!layout.isBlock(node)) run.push(node);
  }

  report(context, layout, run);
}

/**
 * Warn on more than eight statements in a row without a blank line.
 *
 * A long unbroken run almost always hides a seam: setup, then a loop, then a check, then the result. Multi-line blocks
 * already break runs (`no-unpadded-blocks` pads them), so this catches walls of simple statements and guards. Uniform
 * runs are one group however long they are: all imports, all declarations or assignments, or all calls on the same
 * root (`app.use(...)`, `expect(...)`). Advisory, because finding the seam takes judgement. The finding anchors on
 * the statement that crosses the limit.
 */
export const noDenseRunsRule = defineRule({
  meta: {
    type: "suggestion",
    docs: {
      description: "Warn on more than eight statements in a row without a blank line.",
    },
    messages: {
      denseRun:
        "{{count}} statements in a row without a blank line; find the seams (setup, loop, check, result) and separate the groups.",
    },
  },
  createOnce(context) {
    return bodyVisitors(context, (layout, body) => checkBody(context, layout, body));
  },
});
