import type { Context, ESTree, SourceCode } from "@oxlint/plugins";

type VisitorKeys = Readonly<Record<string, readonly string[]>>;

/**
 * What owns a body, which decides the checks that apply to it.
 *
 * `program` and `module` are the top level of a file or namespace, `class` a class body, `function` a function's
 * block, and `control` every other block: branches, loops, `try` clauses, bare blocks, static blocks, and `case`s.
 */
export type BodyKind = "program" | "module" | "class" | "function" | "control";

/**
 * One list of sibling statements (or class members) and the lines that open and close it.
 *
 * `opener` is the last line of the body's header: the `{` line, or the `case x:` line. `closer` is the `}` line.
 * Either is null when the body has none (a program has neither; a `case` has no closing brace of its own).
 */
export interface Body {
  kind: BodyKind;
  statements: readonly ESTree.Node[];
  opener: number | null;
  closer: number | null;
}

// Tool directives are not prose about the code below them, so they may sit anywhere.
const PRAGMA_PREFIXES = [
  "@ts-",
  "eslint",
  "oxlint",
  "prettier-ignore",
  "biome-ignore",
  "istanbul",
  "c8\\s",
  "#(?:end)?region",
  "global\\s",
  "@jsx",
  "@vitest-environment",
  "@jest-environment",
  "\\/\\s*<reference",
];
const PRAGMA = new RegExp(`^\\s*(?:${PRAGMA_PREFIXES.join("|")})`);

const FUNCTION_TYPES = new Set(["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression"]);

// A `return` directly under this many statements or more gets its own paragraph (no-unpadded-blocks), even in a
// short body.
export const RETURN_GROUP = 2;

function isNode(value: unknown): value is ESTree.Node {
  return typeof value === "object" && value !== null && "type" in value && typeof value.type === "string";
}

function multiline(node: ESTree.Node): boolean {
  return node.loc.end.line > node.loc.start.line;
}

/** Name a callback after the function it is passed to: `forEach` for `items.forEach(...)`, else null. */
function calleeName(callee: ESTree.Node): string | null {
  switch (callee.type) {
    case "Identifier":
      return callee.name;
    case "MemberExpression":
      return callee.property.type === "Identifier" || callee.property.type === "PrivateIdentifier"
        ? callee.property.name
        : null;
    case "CallExpression":
      return calleeName(callee.callee);
    default:
      return null;
  }
}

/**
 * Label for the first multi-line function body or class inside `node`, searching expressions only.
 *
 * Nested function bodies are not searched: a callback's own callbacks belong to the callback. A function passed to
 * a call is labelled after the callee (`` `describe` callback ``), an immediately invoked one as an IIFE, and any
 * other (inside an object literal, say) as a function.
 */
function nestedBody(node: ESTree.Node, parent: ESTree.Node | null, keys: VisitorKeys): string | null {
  if (FUNCTION_TYPES.has(node.type) && "body" in node && isNode(node.body)) {
    if (node.body.type !== "BlockStatement" || !multiline(node.body)) return null;
    if (parent === null || (parent.type !== "CallExpression" && parent.type !== "NewExpression")) {
      return "`function` block";
    }

    if (parent.callee === node) return "IIFE";
    const name = calleeName(parent.callee);

    return name === null ? "callback" : `\`${name}\` callback`;
  }

  if (node.type === "ClassExpression") return multiline(node) ? "`class` block" : null;

  const fields = new Set(keys[node.type]);

  for (const [key, value] of Object.entries(node)) {
    if (!fields.has(key)) continue;
    const children: unknown[] = Array.isArray(value) ? value : [value];

    for (const child of children) {
      const label = isNode(child) ? nestedBody(child, node, keys) : null;
      if (label !== null) return label;
    }
  }

  return null;
}

/**
 * Line-level view of one file for the blank-line rules: which lines are blank or hold only a comment, and how
 * statements are classified and bounded.
 *
 * A comment directly above a statement belongs to it, so a statement's visual start is the top of that comment run
 * (or its first decorator). Two siblings are separated when the line directly above the second one's visual start
 * is blank; a comment between them does not count, because the blank line belongs above the comment.
 */
export class Layout {
  readonly lines: readonly string[];
  readonly #comments = new Map<number, string>();
  readonly #keys: VisitorKeys;

  constructor(sourceCode: SourceCode) {
    this.lines = sourceCode.lines;
    this.#keys = sourceCode.visitorKeys;

    for (const comment of sourceCode.getAllComments()) {
      const { start, end } = comment.loc;
      const before = this.lines[start.line - 1]?.slice(0, start.column) ?? "";
      const after = this.lines[end.line - 1]?.slice(end.column) ?? "";
      if (before.trim() !== "" || after.trim() !== "") continue;

      for (let line = start.line; line <= end.line; line++) this.#comments.set(line, comment.value);
    }
  }

  /** Whether `line` exists and holds only whitespace. */
  blank(line: number): boolean {
    return line >= 1 && line <= this.lines.length && this.lines[line - 1]?.trim() === "";
  }

  /** Whether `line` holds only a comment. */
  comment(line: number): boolean {
    return this.#comments.has(line);
  }

  /** Whether `line` holds only a comment that describes code rather than directing a tool. */
  proseComment(line: number): boolean {
    const value = this.#comments.get(line);
    return value !== undefined && !PRAGMA.test(value);
  }

  /** First line of `node`, counting its decorators and the comments directly above it. */
  visualStart(node: ESTree.Node): number {
    let line = node.loc.start.line;

    if ("decorators" in node && Array.isArray(node.decorators)) {
      for (const decorator of node.decorators) if (isNode(decorator)) line = Math.min(line, decorator.loc.start.line);
    }

    while (this.comment(line - 1)) line--;
    return line;
  }

  /** Whether a blank line sits directly above `node`'s visual start, below the end of `previous`. */
  separated(previous: ESTree.Node, node: ESTree.Node): boolean {
    const start = this.visualStart(node);
    return start - 1 > previous.loc.end.line && this.blank(start - 1);
  }

  /**
   * How to name `node` in a finding when it owns a body (`` `if` block ``, `` `forEach` callback ``), or null for a
   * simple statement or field.
   *
   * A body owner is control flow, a declaration or class member with a body, an object type alias, or a statement
   * whose expression holds a multi-line function body or class: a callback (`items.forEach((item) => { ... })`,
   * `describe(...)`), an IIFE, or a function-valued `const`. Overload signatures have no body and are never labelled.
   * Export wrappers and labels are looked through.
   */
  label(node: ESTree.Node): string | null {
    switch (node.type) {
      case "IfStatement":
        return "`if` block";
      case "ForStatement":
        return "`for` block";
      case "ForInStatement":
        return "`for...in` block";
      case "ForOfStatement":
        return "`for...of` block";
      case "WhileStatement":
        return "`while` block";
      case "DoWhileStatement":
        return "`do...while` block";
      case "TryStatement":
        return "`try` block";
      case "SwitchStatement":
        return "`switch` block";
      case "BlockStatement":
        return "block";
      case "FunctionDeclaration":
        return "`function` block";
      case "ClassDeclaration":
        return "`class` block";
      case "TSInterfaceDeclaration":
        return "`interface` block";
      case "TSEnumDeclaration":
        return "`enum` block";
      case "TSModuleDeclaration":
        return "`namespace` block";
      case "StaticBlock":
        return "`static` block";
      case "TSTypeAliasDeclaration":
        return node.typeAnnotation.type === "TSTypeLiteral" || node.typeAnnotation.type === "TSMappedType"
          ? "`type` block"
          : null;
      case "MethodDefinition":
        return node.value.type === "TSEmptyBodyFunctionExpression" ? null : "`method` block";
      case "PropertyDefinition":
        return node.value === null ? null : nestedBody(node.value, null, this.#keys);
      case "ExpressionStatement":
        return nestedBody(node.expression, null, this.#keys);
      case "VariableDeclaration": {
        const [only, ...more] = node.declarations;
        return only?.init != null && more.length === 0 ? nestedBody(only.init, null, this.#keys) : null;
      }
      case "LabeledStatement":
        return this.label(node.body);
      case "ExportNamedDeclaration":
        return node.declaration === null ? null : this.label(node.declaration);
      case "ExportDefaultDeclaration":
        return this.label(node.declaration) ?? nestedBody(node.declaration, null, this.#keys);
      default:
        return null;
    }
  }

  /**
   * Whether `node` is an `if` without `else`, or a loop, whose whole body is one simple statement, braced or not.
   *
   * Only a short guard, one whose header and body statement fit on one line each, is exempt from padding; see
   * `isBlock`.
   */
  isGuardShaped(node: ESTree.Node): boolean {
    const body = guardBody(node);
    if (body === null) return false;
    if (body.type !== "BlockStatement") return this.label(body) === null || !multiline(body);

    const [only, ...more] = body.body;
    return only !== undefined && more.length === 0 && (this.label(only) === null || !multiline(only));
  }

  /** Whether `node` owns a multi-line body and is not a short guard, so it must be padded with blank lines. */
  isBlock(node: ESTree.Node): boolean {
    if (this.label(node) === null || !multiline(node)) return false;
    if (!this.isGuardShaped(node)) return true;

    const body = guardBody(node);
    const span = node.loc.end.line - node.loc.start.line;
    if (body?.type !== "BlockStatement") return span > 1;

    // A braced guard is short when `{` ends its header line and its one statement takes the next line.
    return span > 2 || body.loc.start.line !== node.loc.start.line;
  }
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

/**
 * Visitors that hand every body in a file to `visit`, with the file's `Layout`.
 *
 * `Program` is entered before anything else in a file, so the layout it builds serves every later visitor.
 */
export function bodyVisitors(context: Context, visit: (layout: Layout, body: Body) => void) {
  let layout: Layout;

  const braced = (kind: BodyKind, node: ESTree.Node, statements: readonly ESTree.Node[]) =>
    visit(layout, { kind, statements, opener: node.loc.start.line, closer: node.loc.end.line });

  return {
    Program(node: ESTree.Program) {
      layout = new Layout(context.sourceCode);
      visit(layout, { kind: "program", statements: node.body, opener: null, closer: null });
    },
    BlockStatement(node: ESTree.BlockStatement) {
      braced(FUNCTION_TYPES.has(node.parent.type) ? "function" : "control", node, node.body);
    },
    StaticBlock: (node: ESTree.StaticBlock) => braced("control", node, node.body),
    ClassBody: (node: ESTree.ClassBody) => braced("class", node, node.body),
    TSModuleBlock: (node: ESTree.TSModuleBlock) => braced("module", node, node.body),
    SwitchCase(node: ESTree.SwitchCase) {
      const opener = node.test === null ? node.loc.start.line : node.test.loc.end.line;
      visit(layout, { kind: "control", statements: node.consequent, opener, closer: null });
    },
  };
}
