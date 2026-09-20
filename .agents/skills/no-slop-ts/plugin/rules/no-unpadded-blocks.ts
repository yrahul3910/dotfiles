import { defineRule } from "@oxlint/plugins";

import type { Context, ESTree } from "@oxlint/plugins";

function isFunctionWithBody(expression: ESTree.Expression): boolean {
  return (
    (expression.type === "FunctionExpression" || expression.type === "ArrowFunctionExpression") &&
    expression.body !== null &&
    expression.body.type === "BlockStatement"
  );
}

/**
 * Keyword naming a block-like node, or null for simple statements, expressions, and fields.
 *
 * Block-like means the node owns a body: control flow, declarations with a body, class members
 * with a body, and a `const`/`let` whose single initializer is a function with a block body.
 * Export wrappers are looked through, so `export function f() {}` is a `function`.
 */
function blockKeyword(node: ESTree.Node): string | null {
  switch (node.type) {
    case "IfStatement":
      return "if";
    case "ForStatement":
      return "for";
    case "ForInStatement":
      return "for...in";
    case "ForOfStatement":
      return "for...of";
    case "WhileStatement":
      return "while";
    case "DoWhileStatement":
      return "do...while";
    case "TryStatement":
      return "try";
    case "SwitchStatement":
      return "switch";
    case "BlockStatement":
      return "block";
    case "FunctionDeclaration":
      return "function";
    case "ClassDeclaration":
      return "class";
    case "TSInterfaceDeclaration":
      return "interface";
    case "TSEnumDeclaration":
      return "enum";
    case "TSModuleDeclaration":
      return "namespace";
    case "MethodDefinition":
      return "method";
    case "StaticBlock":
      return "static";
    case "PropertyDefinition":
      return node.value !== null && isFunctionWithBody(node.value) ? "method" : null;
    case "VariableDeclaration": {
      const [only, ...more] = node.declarations;
      const single = only !== undefined && more.length === 0 ? only.init : null;
      return single !== null && isFunctionWithBody(single) ? "function" : null;
    }
    case "ExportNamedDeclaration":
      return node.declaration === null ? null : blockKeyword(node.declaration);
    case "ExportDefaultDeclaration":
      return blockKeyword(node.declaration);
    default:
      return null;
  }
}

function isSimple(node: ESTree.Node): boolean {
  return blockKeyword(node) === null || node.loc.start.line === node.loc.end.line;
}

/** Body of an `if` without `else` or of a loop, the only shapes that can be a short guard. */
function guardBody(node: ESTree.Node): ESTree.Statement | null {
  switch (node.type) {
    case "IfStatement":
      return node.alternate === null ? node.consequent : null;
    case "ForStatement":
    case "ForInStatement":
    case "ForOfStatement":
    case "WhileStatement":
    case "DoWhileStatement":
      return node.body;
    default:
      return null;
  }
}

/** Whether `node` is a short guard: an `if` without `else`, or a loop, whose whole body is one simple statement. */
function isGuard(node: ESTree.Node): boolean {
  const body = guardBody(node);
  if (body === null) return false;
  if (body.type !== "BlockStatement") return isSimple(body);

  const [only, ...more] = body.body;
  return only !== undefined && more.length === 0 && isSimple(only);
}

function isBlock(node: ESTree.Node): boolean {
  return blockKeyword(node) !== null && node.loc.end.line > node.loc.start.line && !isGuard(node);
}

function checkSiblings(context: Context, siblings: readonly ESTree.Node[]): void {
  const { lines } = context.sourceCode;
  const blankBetween = (endLine: number, startLine: number): boolean =>
    lines.slice(endLine, startLine - 1).some((line) => line.trim() === "");

  siblings.forEach((node, index) => {
    const keyword = blockKeyword(node);
    if (keyword === null || !isBlock(node)) return;

    const previous = siblings[index - 1];
    if (previous !== undefined && !blankBetween(previous.loc.end.line, node.loc.start.line)) {
      context.report({ node, messageId: "missingBefore", data: { keyword } });
    }

    // A following block reports the same gap as its own "before" finding.
    const following = siblings[index + 1];
    if (following === undefined || isBlock(following)) return;
    if (!blankBetween(node.loc.end.line, following.loc.start.line)) {
      context.report({ node: following, messageId: "missingAfter", data: { keyword } });
    }
  });
}

/**
 * Require a blank line before and after every multi-line block.
 *
 * A multi-line `if`, loop, `try`, `switch`, function, class, interface, enum, namespace, class
 * member with a body, or function-valued `const` is a logical block; running it straight into its
 * neighbours produces a wall of code. Short guards (one simple body statement, no `else`) are
 * exempt, as is the first or last member of a body.
 */
export const noUnpaddedBlocksRule = defineRule({
  meta: {
    type: "layout",
    docs: {
      description: "Require a blank line before and after every multi-line block.",
    },
    messages: {
      missingBefore:
        "No blank line before this multi-line `{{keyword}}` block; separate logical blocks with a blank line.",
      missingAfter:
        "No blank line after the multi-line `{{keyword}}` block above; separate logical blocks with a blank line.",
    },
  },
  createOnce(context) {
    return {
      Program: (node) => checkSiblings(context, node.body),
      BlockStatement: (node) => checkSiblings(context, node.body),
      StaticBlock: (node) => checkSiblings(context, node.body),
      TSModuleBlock: (node) => checkSiblings(context, node.body),
      SwitchCase: (node) => checkSiblings(context, node.consequent),
      ClassBody: (node) => checkSiblings(context, node.body),
    };
  },
});
