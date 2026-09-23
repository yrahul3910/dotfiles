import { defineRule } from "@oxlint/plugins";

import { RETURN_GROUP, bodyVisitors } from "../shared/vertical-layout.ts";

import type { Context, ESTree } from "@oxlint/plugins";
import type { Body, Layout } from "../shared/vertical-layout.ts";

const BLOCK_FIX = "separate logical blocks with a blank line";
const GUARD_HINT = " A guard is exempt only when its header and its one body statement each fit on one line.";

/** Name of the function an overload signature declares, or null when `node` is not one. */
function overloadName(node: ESTree.Node): string | null {
  switch (node.type) {
    case "TSDeclareFunction":
      return node.id?.name ?? null;
    case "MethodDefinition":
      return node.value.type === "TSEmptyBodyFunctionExpression" && node.key.type === "Identifier"
        ? node.key.name
        : null;
    case "ExportNamedDeclaration":
      return node.declaration === null ? null : overloadName(node.declaration);
    default:
      return null;
  }
}

/** Name of the function or method `node` implements, or null. */
function implementationName(node: ESTree.Node): string | null {
  switch (node.type) {
    case "FunctionDeclaration":
      return node.id?.name ?? null;
    case "MethodDefinition":
      return node.key.type === "Identifier" ? node.key.name : null;
    case "ExportNamedDeclaration":
      return node.declaration === null ? null : implementationName(node.declaration);
    case "ExportDefaultDeclaration":
      return implementationName(node.declaration);
    default:
      return null;
  }
}

/** Whether `node` is an `if` without `else` whose whole body returns or throws: one entry in a dispatch chain. */
function exits(node: ESTree.Node): boolean {
  if (node.type !== "IfStatement" || node.alternate !== null) return false;

  const body = node.consequent.type === "BlockStatement" ? node.consequent.body : [node.consequent];
  const [only, ...more] = body;

  return more.length === 0 && (only?.type === "ReturnStatement" || only?.type === "ThrowStatement");
}

/**
 * Whether `statements[index]` is a `return` directly under `RETURN_GROUP` or more statements with no blank line.
 *
 * The statements count back to the nearest blank line or multi-line block. A fallback `return` under nothing but
 * exiting guards ends a dispatch chain and is never crowded.
 */
function crowdedReturn(layout: Layout, statements: readonly ESTree.Node[], index: number): boolean {
  if (statements[index]?.type !== "ReturnStatement") return false;

  let top = index;

  while (top > 0) {
    const above = statements[top - 1];
    const current = statements[top];
    if (above === undefined || current === undefined) break;
    if (layout.isBlock(above) || layout.separated(above, current)) break;
    top--;
  }

  return index - top >= RETURN_GROUP && !statements.slice(top, index).every(exits);
}

/**
 * Report a missing blank line on `anchor`'s visual start, the line the blank line belongs above.
 *
 * The message ends with `fix`, or, when a comment sits directly above `anchor`, with a note to put the blank line
 * above that comment. `data` fills the message's other placeholders.
 */
function reportMissing(
  context: Context,
  layout: Layout,
  anchor: ESTree.Node,
  messageId: "missingBefore" | "missingAfter" | "crowdedReturn",
  data: { fix: string; what?: string; hint?: string },
): void {
  const line = layout.visualStart(anchor);
  const text = layout.lines[line - 1] ?? "";
  const fix = layout.comment(line) ? "add it above the comment, which belongs to the code below it" : data.fix;

  context.report({
    loc: { start: { line, column: text.length - text.trimStart().length }, end: { line, column: text.length } },
    messageId,
    data: { what: "block", hint: "", ...data, fix },
  });
}

function checkBody(context: Context, layout: Layout, { statements }: Body): void {
  statements.forEach((node, index) => {
    if (crowdedReturn(layout, statements, index)) {
      reportMissing(context, layout, node, "crowdedReturn", { fix: "give it its own paragraph" });
    }

    if (!layout.isBlock(node)) return;

    const previous = statements[index - 1];
    const overloaded = previous === undefined ? null : overloadName(previous);
    const chained = overloaded !== null && overloaded === implementationName(node);
    const hint = layout.isGuardShaped(node) ? GUARD_HINT : "";
    const block = { fix: BLOCK_FIX, what: layout.label(node) ?? "block", hint };

    if (previous !== undefined && !chained && !layout.separated(previous, node)) {
      reportMissing(context, layout, node, "missingBefore", block);
    }

    // A following block reports the same gap as its own "before" finding.
    const following = statements[index + 1];
    if (following === undefined || layout.isBlock(following) || layout.separated(node, following)) return;

    reportMissing(context, layout, following, "missingAfter", block);
  });
}

/**
 * Require a blank line before and after every multi-line block.
 *
 * A multi-line `if`, loop, `try`, `switch`, function, class, interface, enum, namespace, object `type`, class member
 * with a body, or statement holding a multi-line callback (`items.forEach(...)`, `describe(...)`, a function-valued
 * `const`) is a logical block; running it straight into its neighbours produces a wall of code. Short guards (an
 * `if` without `else`, or a loop, whose header and single body statement fit on one line each) are exempt, as are an
 * implementation directly under its overload signatures and the first or last member of a body.
 *
 * A `return` that ends a run of two or more statements (guards included) gets a blank line above it too, so the result
 * stands apart from the steps that produce it. Directly under a single statement it may stay, and so may the fallback
 * `return` of a dispatch chain, where every statement above it is a guard that returns or throws. A comment directly
 * above a block or `return` belongs to it, so the blank line goes above the comment.
 */
export const noUnpaddedBlocksRule = defineRule({
  meta: {
    type: "layout",
    docs: {
      description: "Require a blank line before and after every multi-line block.",
    },
    messages: {
      missingBefore: "No blank line before this multi-line {{what}}; {{fix}}.{{hint}}",
      missingAfter: "No blank line after the multi-line {{what}} above; {{fix}}.{{hint}}",
      crowdedReturn: "No blank line before this `return`, which ends a group of two or more statements; {{fix}}.",
    },
  },
  createOnce(context) {
    return bodyVisitors(context, (layout, body) => checkBody(context, layout, body));
  },
});
