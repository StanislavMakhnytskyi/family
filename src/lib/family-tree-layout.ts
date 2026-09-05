import type { Person, Relationship } from "@/lib/schemas";

export type FamilyTreeNode = {
  id: string;
  /** Row index — ancestors are negative, descendants positive, relative to whichever person layout starts from. */
  generation: number;
  /** Left-to-right column index. Not necessarily contiguous within a row, but consistent ordering across the whole layout. */
  column: number;
};

export type FamilyTreeLayout = {
  nodes: Map<string, FamilyTreeNode>;
};

type Graph = {
  parentsOf: Map<string, string[]>;
  childrenOf: Map<string, string[]>;
  spousesOf: Map<string, string[]>;
  siblingsOf: Map<string, string[]>;
};

function buildGraph(people: Person[], relationships: Relationship[]): Graph {
  const parentsOf = new Map<string, string[]>();
  const childrenOf = new Map<string, string[]>();
  const spousesOf = new Map<string, string[]>();
  const siblingsOf = new Map<string, string[]>();
  for (const person of people) {
    parentsOf.set(person.id, []);
    childrenOf.set(person.id, []);
    spousesOf.set(person.id, []);
    siblingsOf.set(person.id, []);
  }

  function push(map: Map<string, string[]>, key: string, value: string) {
    const list = map.get(key);
    if (list && !list.includes(value)) list.push(value);
  }

  for (const rel of relationships) {
    if (rel.type === "parent-child") {
      push(childrenOf, rel.person1Id, rel.person2Id);
      push(parentsOf, rel.person2Id, rel.person1Id);
    } else if (rel.type === "spouse") {
      push(spousesOf, rel.person1Id, rel.person2Id);
      push(spousesOf, rel.person2Id, rel.person1Id);
    } else if (rel.type === "sibling") {
      push(siblingsOf, rel.person1Id, rel.person2Id);
      push(siblingsOf, rel.person2Id, rel.person1Id);
    }
  }

  return { parentsOf, childrenOf, spousesOf, siblingsOf };
}

/**
 * For each person with no recorded parents ("parentless") who has a
 * "sibling" relationship to someone else, decides who's the "anchor" (kept
 * as a normal tree root/member) and who's the "satellite" (positioned as
 * an extra member right next to the anchor instead — see assignColumns).
 * This is specifically for the case the sibling relationship type exists
 * for: a relative known to be someone's sibling without knowing (or
 * without it being recorded) their shared parents, e.g. a
 * cousin-grandparent added as a sibling of an actual grandparent.
 *
 * Preference order: attach to a sibling who already has real parents (a
 * proper place in the tree) over one who's also parentless; if both are
 * parentless, break the tie by id so a mutually-isolated pair still ends
 * up clustered together instead of neither being chosen. Only direct
 * sibling edges are resolved -- a chain of satellites-of-satellites (no
 * one in the chain otherwise anchored) isn't something the described use
 * case produces, so it isn't specially handled here.
 */
function computeSiblingAnchors(people: Person[], graph: Graph): Map<string, string> {
  const isParentless = (id: string) => (graph.parentsOf.get(id) ?? []).length === 0;
  const anchorOf = new Map<string, string>();

  for (const person of people) {
    if (anchorOf.has(person.id) || !isParentless(person.id)) continue;
    for (const siblingId of graph.siblingsOf.get(person.id) ?? []) {
      // Don't attach to someone who is themselves already our satellite --
      // that would just swap which end of the pair is "the anchor" for no
      // reason, or (in a 3+-way case) create a cycle.
      if (anchorOf.get(siblingId) === person.id) continue;
      if (!isParentless(siblingId) || siblingId < person.id) {
        anchorOf.set(person.id, siblingId);
        break;
      }
    }
  }

  return anchorOf;
}

/**
 * Assigns every person a generation (row), propagating outward from an
 * arbitrary start: children are one row below their parents, spouses share
 * a row. Handles a family made of multiple blood lines joined only by
 * marriage (in-laws) by re-seeding a BFS from any still-unreached person
 * once the current one runs out — every person ends up with a generation,
 * regardless of how many marriage-only "bridges" separate them.
 *
 * A sibling satellite (see computeSiblingAnchors) shares its anchor's
 * generation too, but never starts its own BFS -- it must only ever be
 * reached *through* its anchor, or it could seed its own independent
 * generation-0 component first (if it happens to come first in `people`)
 * and end up on the wrong row relative to the anchor it's meant to sit
 * beside.
 */
function assignGenerations(
  people: Person[],
  graph: Graph,
  siblingAnchorOf: Map<string, string>,
): Map<string, number> {
  const generation = new Map<string, number>();

  for (const start of people) {
    if (generation.has(start.id) || siblingAnchorOf.has(start.id)) continue;
    generation.set(start.id, 0);
    const queue = [start.id];
    while (queue.length > 0) {
      const id = queue.shift()!;
      const g = generation.get(id)!;
      for (const parentId of graph.parentsOf.get(id) ?? []) {
        if (!generation.has(parentId)) {
          generation.set(parentId, g - 1);
          queue.push(parentId);
        }
      }
      for (const childId of graph.childrenOf.get(id) ?? []) {
        if (!generation.has(childId)) {
          generation.set(childId, g + 1);
          queue.push(childId);
        }
      }
      for (const spouseId of graph.spousesOf.get(id) ?? []) {
        if (!generation.has(spouseId)) {
          generation.set(spouseId, g);
          queue.push(spouseId);
        }
      }
      for (const siblingId of graph.siblingsOf.get(id) ?? []) {
        if (!generation.has(siblingId)) {
          generation.set(siblingId, g);
          queue.push(siblingId);
        }
      }
    }
  }

  return generation;
}

type ChildGroup = { children: string[] };

/**
 * Orders everyone left-to-right with a compact, two-pass tree layout —
 * the same technique classic tree-drawing algorithms use (compute each
 * subtree's actual width bottom-up, then place it centered within exactly
 * that width top-down). This is what makes the difference between "every
 * branch reserves a full column whether it needs one or not" (a person at
 * the left edge of a subtree that fans out far to their right) and "a
 * couple sits centered above their own descendants, and a lone
 * single-child chain takes no more room than one column."
 *
 * Guarantees, by construction:
 * - No two subtrees' reserved ranges ever overlap (each is exactly as
 *   wide as `computeWidth` said, and children are placed back-to-back
 *   within their parent's reservation).
 * - A person and each of their spouses always land exactly one column
 *   apart, however their combined children end up centered.
 * - Someone with multiple spouses (remarriage) only has *that specific
 *   spouse's* shared children counted toward centering them — not every
 *   spouse's children pooled together — so a blended family doesn't drag
 *   one marriage's kids under the wrong parent.
 * - A sibling satellite (see computeSiblingAnchors) lands exactly one
 *   column from its anchor, the same way a spouse would -- but
 *   contributes no children of its own to the anchor's centering (a
 *   satellite is expected to be a standalone leaf; see the caveat there).
 */
function assignColumns(
  people: Person[],
  graph: Graph,
  siblingAnchorOf: Map<string, string>,
): Map<string, number> {
  function byBirthDate(a: string, b: string): number {
    const personA = people.find((p) => p.id === a);
    const personB = people.find((p) => p.id === b);
    return (personA?.birthDate ?? "").localeCompare(personB?.birthDate ?? "");
  }

  function discoverOrder(): string[] {
    // Sibling satellites are pre-marked visited so they're never
    // independently seeded as their own root (by the roots filter below,
    // by the marriage-bridge fallback, or otherwise) -- they must only
    // ever be reached as a member of their anchor's unit, in computeWidth.
    const visited = new Set<string>(siblingAnchorOf.keys());
    const order: string[] = [];
    function visit(id: string) {
      if (visited.has(id)) return;
      visited.add(id);
      order.push(id);
      const spouses = graph.spousesOf.get(id) ?? [];
      const idChildren = new Set(graph.childrenOf.get(id) ?? []);
      const attributed = new Set<string>();
      for (const spouseId of spouses) {
        if (!visited.has(spouseId)) {
          visited.add(spouseId);
          order.push(spouseId);
        }
        const spouseChildren = new Set(graph.childrenOf.get(spouseId) ?? []);
        const coupleChildren = [...idChildren].filter((c) => spouseChildren.has(c));
        for (const c of coupleChildren) attributed.add(c);
        for (const childId of coupleChildren.sort(byBirthDate)) visit(childId);
      }
      const remaining = [...idChildren].filter((c) => !attributed.has(c));
      for (const childId of remaining.sort(byBirthDate)) visit(childId);
    }

    const roots = people.filter(
      (p) => (graph.parentsOf.get(p.id) ?? []).length === 0 && !siblingAnchorOf.has(p.id),
    );
    for (const root of roots) visit(root.id);

    // Fallback: anyone left is only reachable through a marriage bridge
    // (e.g. a married-in spouse's own parents). Keep seeding fresh
    // traversals, preferring people whose own parents are already placed,
    // until everyone has been discovered.
    let remaining = people.filter((p) => !visited.has(p.id));
    while (remaining.length > 0) {
      const next =
        remaining.find((p) =>
          (graph.parentsOf.get(p.id) ?? []).every((parentId) => visited.has(parentId)),
        ) ?? remaining[0];
      visit(next.id);
      remaining = people.filter((p) => !visited.has(p.id));
    }
    return order;
  }

  // Same grouping/traversal shape as before, just split into two passes:
  // the discovery walk fixes which spouses belong to which unit and which
  // children belong to which marriage, and both passes below reuse that
  // exact same grouping so they stay in agreement.
  const claimed = new Set<string>();
  const membersOf = new Map<string, string[]>();
  const groupsOf = new Map<string, ChildGroup[]>();
  const widthOf = new Map<string, number>();

  function computeWidth(id: string): number {
    if (widthOf.has(id)) return widthOf.get(id)!;
    claimed.add(id);
    const spouses = (graph.spousesOf.get(id) ?? []).filter((s) => !claimed.has(s));
    for (const s of spouses) claimed.add(s);
    // Sibling satellites sit adjacent exactly like a spouse for placement
    // purposes, but (unlike spouses) never contribute a children group --
    // see the doc comment above.
    const siblingSatellites = (graph.siblingsOf.get(id) ?? []).filter(
      (s) => siblingAnchorOf.get(s) === id && !claimed.has(s),
    );
    for (const s of siblingSatellites) claimed.add(s);
    membersOf.set(id, [id, ...spouses, ...siblingSatellites]);

    const idChildren = new Set(graph.childrenOf.get(id) ?? []);
    const attributed = new Set<string>();
    const groups: ChildGroup[] = [];
    let childrenWidth = 0;

    // A child already `claimed` elsewhere is someone who turned out to be
    // both this person's blood child *and* already positioned as another
    // unit's spouse (e.g. an in-law bridge: X's parent also happens to be
    // Y's child from a totally different branch). They're already
    // correctly placed via that marriage — counting them here too would
    // double their width contribution and pull this unit's centering
    // toward a position that has nothing to do with it. The connector
    // line to them still draws correctly regardless, since that's driven
    // by raw relationship data, not this grouping.
    for (const spouseId of spouses) {
      const spouseChildren = new Set(graph.childrenOf.get(spouseId) ?? []);
      const coupleChildren = [...idChildren]
        .filter((c) => spouseChildren.has(c) && !claimed.has(c))
        .sort(byBirthDate);
      for (const c of coupleChildren) attributed.add(c);
      groups.push({ children: coupleChildren });
      childrenWidth += coupleChildren.reduce((sum, c) => sum + computeWidth(c), 0);
    }
    const remaining = [...idChildren]
      .filter((c) => !attributed.has(c) && !claimed.has(c))
      .sort(byBirthDate);
    groups.push({ children: remaining });
    childrenWidth += remaining.reduce((sum, c) => sum + computeWidth(c), 0);

    groupsOf.set(id, groups);
    const width = Math.max(membersOf.get(id)!.length, childrenWidth);
    widthOf.set(id, width);
    return width;
  }

  const column = new Map<string, number>();

  function place(id: string, leftEdge: number) {
    if (column.has(id)) return;
    const members = membersOf.get(id) ?? [id];
    const groups = groupsOf.get(id) ?? [];
    const width = widthOf.get(id) ?? 1;
    const childrenWidth = groups.reduce(
      (sum, g) => sum + g.children.reduce((s, c) => s + (widthOf.get(c) ?? 1), 0),
      0,
    );

    // Center the children as a block within this unit's reserved width
    // when the couple itself needs more room than its children do (e.g. a
    // remarried person with three spouses but only one child).
    let cursor = leftEdge + Math.max(0, (width - childrenWidth) / 2);
    const groupCenters: number[] = [];
    for (const group of groups) {
      if (group.children.length === 0) continue;
      const childPositions: number[] = [];
      for (const child of group.children) {
        place(child, cursor);
        childPositions.push(column.get(child)!);
        cursor += widthOf.get(child) ?? 1;
      }
      groupCenters.push(average(childPositions));
    }

    const blockCenter = groupCenters.length > 0 ? average(groupCenters) : leftEdge + width / 2;
    const startX = blockCenter - (members.length - 1) / 2;
    members.forEach((memberId, i) => column.set(memberId, startX + i));
  }

  function average(values: number[]): number {
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  const order = discoverOrder();
  let cursor = 0;
  for (const id of order) {
    // `claimed` (not `widthOf`) is what marks someone as already absorbed
    // into a unit — a childless, parentless placeholder spouse never gets
    // their own `widthOf` entry any other way, since they're neither a
    // top-level root themselves nor ever reached as someone's child.
    if (claimed.has(id)) continue;
    const width = computeWidth(id);
    place(id, cursor);
    cursor += width;
  }

  return column;
}

export function computeFamilyTreeLayout(
  people: Person[],
  relationships: Relationship[],
): FamilyTreeLayout {
  const graph = buildGraph(people, relationships);
  const siblingAnchorOf = computeSiblingAnchors(people, graph);
  const generation = assignGenerations(people, graph, siblingAnchorOf);
  const column = assignColumns(people, graph, siblingAnchorOf);

  const nodes = new Map<string, FamilyTreeNode>();
  for (const person of people) {
    nodes.set(person.id, {
      id: person.id,
      generation: generation.get(person.id) ?? 0,
      column: column.get(person.id) ?? 0,
    });
  }

  return { nodes };
}
