import type { ESTree } from "@oxlint/plugins";

type VisitorKeys = Readonly<Record<string, readonly string[]>>;

function isNode(value: unknown): value is ESTree.Node {
	return (
		typeof value === "object" &&
		value !== null &&
		"type" in value &&
		typeof value.type === "string"
	);
}

function collectInferTypeParameterNames(
	node: ESTree.Node,
	visitorKeys: VisitorKeys,
	names: Set<string>,
): void {
	if (node.type === "TSInferType") names.add(node.typeParameter.name.name);

	const fields = new Set(visitorKeys[node.type]);

	for (const [key, value] of Object.entries(node)) {
		if (!fields.has(key)) continue;

		const children: unknown[] = Array.isArray(value) ? value : [value];

		for (const child of children) {
			if (isNode(child)) collectInferTypeParameterNames(child, visitorKeys, names);
		}
	}
}

/**
 * Collect the names of the type parameters in scope at `node`, which hide any module-level type alias of the same name.
 *
 * The walk goes from `node` up to the program. It gathers the type parameters of every enclosing generic declaration
 * (function, method, class, interface, type alias), the key of an enclosing mapped type when `node` sits in its `as`
 * clause or value type, and the `infer` names declared in an enclosing conditional type's extends clause when `node`
 * sits in its true branch. `visitorKeys` drives the search for those `infer` declarations. The result is a fresh set,
 * which callers use to skip aliases that a local binder shadows.
 */
export function lexicalTypeParameterNames(
	node: ESTree.Node,
	visitorKeys: VisitorKeys,
): ReadonlySet<string> {
	const names = new Set<string>();
	let descendant: ESTree.Node = node;
	let current: ESTree.Node | null = node;
	while (current !== null && current.type !== "Program") {
		if ("typeParameters" in current) {
			for (const parameter of current.typeParameters?.params ?? []) {
				names.add(parameter.name.name);
			}
		}
		if (
			current.type === "TSMappedType" &&
			(descendant === current.nameType || descendant === current.typeAnnotation)
		) {
			names.add(current.key.name);
		}
		if (current.type === "TSConditionalType" && descendant === current.trueType) {
			collectInferTypeParameterNames(current.extendsType, visitorKeys, names);
		}
		descendant = current;
		current = current.parent;
	}
	return names;
}
