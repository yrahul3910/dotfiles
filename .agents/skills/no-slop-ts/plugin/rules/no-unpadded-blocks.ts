import { defineRule } from "@oxlint/plugins";

import { bodyVisitors } from "../shared/vertical-layout.ts";

import type { Context, ESTree } from "@oxlint/plugins";
import type { Body, Layout } from "../shared/vertical-layout.ts";

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

/** Report a missing blank line on `anchor`'s visual start, the line the blank line belongs above. */
function reportMissing(
  context: Context,
  layout: Layout,
  anchor: ESTree.Node,
  messageId: "missingBefore" | "missingAfter",
  block: ESTree.Node,
): void {
  const line = layout.visualStart(anchor);
  const text = layout.lines[line - 1] ?? "";
  const fix = layout.comment(line)
    ? "add it above the comment, which belongs to the code below it"
    : "separate logical blocks with a blank line";

  context.report({
    loc: { start: { line, column: text.length - text.trimStart().length }, end: { line, column: text.length } },
    messageId,
    data: { what: layout.label(block) ?? "block", fix, hint: layout.isGuardShaped(block) ? GUARD_HINT : "" },
  });
}

function checkBody(context: Context, layout: Layout, { statements }: Body): void {
  statements.forEach((node, index) => {
    if (!layout.isBlock(node)) return;

    const previous = statements[index - 1];
    const overloaded = previous === undefined ? null : overloadName(previous);
    const chained = overloaded !== null && overloaded === implementationName(node);

    if (previous !== undefined && !chained && !layout.separated(previous, node)) {
      reportMissing(context, layout, node, "missingBefore", node);
    }

    // A following block reports the same gap as its own "before" finding.
    const following = statements[index + 1];
    if (following === undefined || layout.isBlock(following) || layout.separated(node, following)) return;

    reportMissing(context, layout, following, "missingAfter", node);
  });
}

/**
 * Require a blank line before and after every multi-line block.
 *
 * A multi-line `if`, loop, `try`, `switch`, function, class, interface, enum, namespace, object `type`, class member
 * with a body, or statement holding a multi-line callback (`items.forEach(...)`, `describe(...)`, a function-valued
 * `const`) is a logical block; running it straight into its neighbours produces a wall of code. Short guards (an
 * `if` without `else`, or a loop, whose header and single body statement fit on one line each) are exempt, as are an
 * implementation directly under its overload signatures and the first or last member of a body. A comment directly
 * above a block belongs to it, so the blank line goes above the comment.
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
    },
  },
  createOnce(context) {
    return bodyVisitors(context, (layout, body) => checkBody(context, layout, body));
  },
});
