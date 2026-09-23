import { defineRule } from "@oxlint/plugins";

import type { Context, ESTree, SourceCode } from "@oxlint/plugins";

type FunctionNode = ESTree.Function | ESTree.ArrowFunctionExpression;

const MIN_BODY_LINES = 20;
const MIN_THROWS = 2;

/** The declaration that binds a function expression: its `const`, class member, or object property. */
function bindingOf(parent: ESTree.Node): ESTree.Node | null {
  switch (parent.type) {
    case "VariableDeclarator":
      return parent.parent.type === "VariableDeclaration" ? parent.parent : null;
    case "MethodDefinition":
    case "PropertyDefinition":
    case "Property":
      return parent;
    default:
      return null; // callbacks and IIFEs are not documented in place
  }
}

/** The node a doc comment for `fn` sits above: its declaration or binding, or the export wrapping either. */
function docOwner(fn: FunctionNode): ESTree.Node | null {
  const owner = fn.type === "FunctionDeclaration" ? fn : bindingOf(fn.parent);
  if (owner === null) return null;

  const wrapper = owner.parent;
  const exported =
    wrapper !== null && (wrapper.type === "ExportNamedDeclaration" || wrapper.type === "ExportDefaultDeclaration");

  return exported ? wrapper : owner;
}

/** The JSDoc block directly above `owner` when its whole content is one line of prose, else null. */
function thinJsdoc(sourceCode: SourceCode, owner: ESTree.Node): ESTree.Comment | null {
  const comment = sourceCode.getCommentsBefore(owner).at(-1);
  if (comment === undefined || comment.type !== "Block" || !comment.value.startsWith("*")) return null;
  if (owner.loc.start.line - comment.loc.end.line !== 1) return null;

  const content = comment.value
    .split("\n")
    .map((line) => line.replace(/^\s*\*+\s?/u, "").trim())
    .filter((line) => line !== "");
  const [only, ...more] = content;

  return only !== undefined && more.length === 0 && !only.startsWith("@") ? comment : null;
}

function check(context: Context, fn: FunctionNode, throws: number): void {
  if (fn.body === null || fn.body.type !== "BlockStatement") return;

  const bodyLines = fn.body.loc.end.line - fn.body.loc.start.line - 1;
  const reasons = [];
  if (bodyLines >= MIN_BODY_LINES) reasons.push(`${bodyLines}-line`);
  if (throws >= MIN_THROWS) reasons.push(`${throws}-throw`);
  if (reasons.length === 0) return;

  const owner = docOwner(fn);
  const comment = owner === null ? null : thinJsdoc(context.sourceCode, owner);
  if (comment === null) return;

  context.report({ loc: comment.loc, messageId: "thinJsdoc", data: { reason: reasons.join(", ") } });
}

/**
 * Flag a one-line JSDoc on a function whose contract needs more than a caption.
 *
 * A long function, or one with several `throw` sites, cannot be documented by a single sentence: the reader needs to
 * know what comes back, what is guaranteed, and how it fails. Short functions with an obvious contract keep their
 * one-liners. Advisory, because writing the contract needs judgement about what it actually is.
 */
export const noThinJsdocRule = defineRule({
  meta: {
    type: "suggestion",
    docs: {
      description: "Disallow one-line JSDoc on long or multi-throw functions; document the contract instead.",
    },
    messages: {
      thinJsdoc:
        "One-line JSDoc on a {{reason}} function; a caption cannot state the contract. " +
        "Say what callers get back, what is guaranteed, and how it fails.",
    },
  },
  createOnce(context) {
    // One counter per enclosing function, innermost last.
    const throwCounts: number[] = [];

    const enter = (): void => {
      throwCounts.push(0);
    };

    const exit = (fn: FunctionNode): void => {
      check(context, fn, throwCounts.pop() ?? 0);
    };

    return {
      before: () => {
        throwCounts.length = 0;
      },
      FunctionDeclaration: enter,
      "FunctionDeclaration:exit": exit,
      FunctionExpression: enter,
      "FunctionExpression:exit": exit,
      ArrowFunctionExpression: enter,
      "ArrowFunctionExpression:exit": exit,
      ThrowStatement: () => {
        const top = throwCounts.length - 1;
        if (top >= 0) throwCounts[top] = (throwCounts[top] ?? 0) + 1;
      },
    };
  },
});
