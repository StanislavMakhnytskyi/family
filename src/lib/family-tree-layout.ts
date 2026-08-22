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
};

function buildGraph(people: Person[], relationships: Relationship[]): Graph {
  const parentsOf = new Map<string, string[]>();
  const childrenOf = new Map<string, string[]>();
  const spousesOf = new Map<string, string[]>();
  for (const person of people) {
    parentsOf.set(person.id, []);
    childrenOf.set(person.id, []);
    spousesOf.set(person.id, []);
  }

  function push(map: Map<string, string[]>, key: string, value: string) {
    const list = map.get(key);
    if (list && !list.includes(value)) list.push(value);
  }

  for (const rel of relationships) {
    if (rel.type === "parent-child") {
      push(childrenOf, rel.person1Id, rel.person2Id);
      push(parentsOf, rel.person2Id, rel.person1Id);
    } else {
      push(spousesOf, rel.person1Id, rel.person2Id);
      push(spousesOf, rel.person2Id, rel.person1Id);
    }
  }

  return { parentsOf, childrenOf, spousesOf };
}

/**
 * Assigns every person a generation (row), propagating outward from an
 * arbitrary start: children are one row below their parents, spouses share
 * a row. Handles a family made of multiple blood lines joined only by
 * marriage (in-laws) by re-seeding a BFS from any still-unreached person
 * once the current one runs out — every person ends up with a generation,
 * regardless of how many marriage-only "bridges" separate them.
 */
function assignGenerations(people: Person[], graph: Graph): Map<string, number> {
  const generation = new Map<string, number>();

  for (const start of people) {
    if (generation.has(start.id)) continue;
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
    }
  }

  return generation;
}

/**
 * Orders everyone left-to-right via depth-first traversal (couples
 * together, then their children), so that closely related people end up
 * near each other on screen. Every person is guaranteed a column: if the
 * primary traversal from blood-line roots doesn't reach someone (a
 * married-in spouse's own parents, for instance), a fallback pass seeds a
 * fresh traversal from whoever is left, preferring people whose own
 * parents are already placed.
 */
function assignColumns(people: Person[], graph: Graph): Map<string, number> {
  const column = new Map<string, number>();
  const visited = new Set<string>();
  let next = 0;

  function visit(id: string) {
    if (visited.has(id)) return;
    visited.add(id);
    column.set(id, next++);

    const spouses = graph.spousesOf.get(id) ?? [];
    for (const spouseId of spouses) {
      if (!visited.has(spouseId)) {
        visited.add(spouseId);
        column.set(spouseId, next++);
      }
    }

    const children = new Set<string>();
    for (const parentId of [id, ...spouses]) {
      for (const childId of graph.childrenOf.get(parentId) ?? []) {
        children.add(childId);
      }
    }
    const orderedChildren = [...children].sort((a, b) => {
      const personA = people.find((p) => p.id === a);
      const personB = people.find((p) => p.id === b);
      return (personA?.birthDate ?? "").localeCompare(personB?.birthDate ?? "");
    });
    for (const childId of orderedChildren) visit(childId);
  }

  const roots = people.filter((p) => (graph.parentsOf.get(p.id) ?? []).length === 0);
  for (const root of roots) visit(root.id);

  // Fallback: anyone left is only reachable through a marriage bridge
  // (e.g. a married-in spouse's own parents). Keep seeding fresh
  // traversals, preferring people whose parents are already placed, until
  // everyone has a column.
  let remaining = people.filter((p) => !visited.has(p.id));
  while (remaining.length > 0) {
    const next_ =
      remaining.find((p) =>
        (graph.parentsOf.get(p.id) ?? []).every((parentId) => visited.has(parentId)),
      ) ?? remaining[0];
    visit(next_.id);
    remaining = people.filter((p) => !visited.has(p.id));
  }

  return column;
}

export function computeFamilyTreeLayout(
  people: Person[],
  relationships: Relationship[],
): FamilyTreeLayout {
  const graph = buildGraph(people, relationships);
  const generation = assignGenerations(people, graph);
  const column = assignColumns(people, graph);

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
