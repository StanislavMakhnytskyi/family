import { describe, expect, it } from "vitest";
import { computeFamilyTreeLayout } from "@/lib/family-tree-layout";
import type { Person, Relationship } from "@/lib/schemas";
import { treeStructurePeople, treeStructureRelationships } from "./fixtures/tree-structure";
import demoPeople from "../../src/data/demo/people.json";
import demoRelationships from "../../src/data/demo/relationships.json";

function person(id: string, birthDate = "2000"): Person {
  return { id, firstName: id, lastName: id, birthDate };
}

type Nodes = ReturnType<typeof computeFamilyTreeLayout>["nodes"];

/** Cards render 156px wide on a 178px column pitch, so columns closer than 1 overlap. */
const EPS = 1e-9;

/** Returns one message per same-row pair of neighbours that sit closer than one column. */
function separationProblems(nodes: Nodes): string[] {
  const byGeneration = new Map<number, { id: string; column: number }[]>();
  for (const node of nodes.values()) {
    const list = byGeneration.get(node.generation) ?? [];
    list.push({ id: node.id, column: node.column });
    byGeneration.set(node.generation, list);
  }
  const problems: string[] = [];
  for (const [generation, row] of byGeneration) {
    row.sort((a, b) => a.column - b.column || a.id.localeCompare(b.id));
    for (let i = 1; i < row.length; i++) {
      const gap = row[i].column - row[i - 1].column;
      if (gap < 1 - EPS) {
        problems.push(
          `generation ${generation}: ${row[i - 1].id} and ${row[i].id} are only ${gap} columns apart (need >= 1)`,
        );
      }
    }
  }
  return problems;
}

/**
 * The real invariant for avoiding visual overlap: neighbours in the same row
 * (generation) must be at least one full column apart. Cards on different rows
 * render at different heights and cannot collide.
 */
function expectNoOverlapWithinGeneration(nodes: Nodes) {
  expect(separationProblems(nodes), "overlapping cards").toEqual([]);
}

function spouseGapProblems(nodes: Nodes, relationships: Relationship[]): string[] {
  const problems: string[] = [];
  for (const rel of relationships) {
    if (rel.type !== "spouse") continue;
    const a = nodes.get(rel.person1Id)!;
    const b = nodes.get(rel.person2Id)!;
    if (a.generation !== b.generation) continue;
    const gap = Math.abs(a.column - b.column);
    if (Math.abs(gap - 1) > EPS) {
      problems.push(`spouses ${a.id} and ${b.id} are ${gap} columns apart (need exactly 1)`);
    }
  }
  return problems;
}

/** Relative layout: shift so the smallest generation and column are 0. */
function normalised(nodes: Nodes): Map<string, { generation: number; column: number }> {
  const all = [...nodes.values()];
  const minGeneration = Math.min(...all.map((n) => n.generation));
  const minColumn = Math.min(...all.map((n) => n.column));
  return new Map(
    all.map((n) => [
      n.id,
      { generation: n.generation - minGeneration, column: n.column - minColumn },
    ]),
  );
}

function orderIndependenceProblems(
  people: Person[],
  relationships: Relationship[],
  shuffled: Person[],
): string[] {
  const base = normalised(computeFamilyTreeLayout(people, relationships).nodes);
  const other = normalised(computeFamilyTreeLayout(shuffled, relationships).nodes);
  const problems: string[] = [];
  for (const [id, a] of base) {
    const b = other.get(id)!;
    if (a.generation !== b.generation || Math.abs(a.column - b.column) > EPS) {
      problems.push(
        `${id}: gen ${a.generation} col ${a.column} vs shuffled gen ${b.generation} col ${b.column}`,
      );
    }
  }
  return problems;
}

/** Small deterministic PRNG so property-test failures are reproducible by seed. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], rand: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

describe("computeFamilyTreeLayout", () => {
  it("places every person on exactly one generation below their parents", () => {
    const people = [person("gramps"), person("gran"), person("parent"), person("child")];
    const relationships: Relationship[] = [
      { id: "r1", type: "spouse", person1Id: "gramps", person2Id: "gran" },
      { id: "r2", type: "parent-child", person1Id: "gramps", person2Id: "parent" },
      { id: "r3", type: "parent-child", person1Id: "gran", person2Id: "parent" },
      { id: "r4", type: "parent-child", person1Id: "parent", person2Id: "child" },
    ];
    const { nodes } = computeFamilyTreeLayout(people, relationships);

    const gGramps = nodes.get("gramps")!.generation;
    expect(nodes.get("gran")!.generation).toBe(gGramps);
    expect(nodes.get("parent")!.generation).toBe(gGramps + 1);
    expect(nodes.get("child")!.generation).toBe(gGramps + 2);
  });

  it("puts spouses on the same generation", () => {
    const people = [person("a"), person("b")];
    const relationships: Relationship[] = [
      { id: "r1", type: "spouse", person1Id: "a", person2Id: "b" },
    ];
    const { nodes } = computeFamilyTreeLayout(people, relationships);
    expect(nodes.get("a")!.generation).toBe(nodes.get("b")!.generation);
  });

  it("places a parentless sibling satellite directly beside its anchor, sharing its generation", () => {
    // `b` has no parents of its own recorded -- known only to be `a`'s
    // sibling (e.g. a cousin-grandparent added as a sibling of an actual
    // grandparent). It should land on `a`'s row, exactly one column away,
    // like a spouse would -- not float disconnected from the rest of the
    // tree, and not disturb `a`'s own parent/child placement.
    const people = [person("a-parent"), person("a"), person("a-child"), person("b")];
    const relationships: Relationship[] = [
      { id: "r1", type: "parent-child", person1Id: "a-parent", person2Id: "a" },
      { id: "r2", type: "parent-child", person1Id: "a", person2Id: "a-child" },
      { id: "r3", type: "sibling", person1Id: "a", person2Id: "b" },
    ];
    const { nodes } = computeFamilyTreeLayout(people, relationships);

    expect(nodes.get("b")!.generation).toBe(nodes.get("a")!.generation);
    expect(Math.abs(nodes.get("b")!.column - nodes.get("a")!.column)).toBe(1);
    expect(nodes.get("a-child")!.generation).toBe(nodes.get("a")!.generation + 1);
    expectNoOverlapWithinGeneration(nodes);
  });

  it("does not miscount a sibling relationship as a spouse pairing for children", () => {
    // Regression test for the original bug: buildGraph() used to have a
    // bare `else` for anything that wasn't "parent-child", so a "sibling"
    // relationship was silently added to spousesOf. That would make `b`
    // eligible for the couple-children grouping in computeWidth -- which
    // should never happen for a sibling, since they don't share children
    // with their sibling the way an actual spouse would.
    const people = [
      person("a-parent"),
      person("a"),
      person("a-child"),
      person("b"),
      person("b-child"),
    ];
    const relationships: Relationship[] = [
      { id: "r1", type: "parent-child", person1Id: "a-parent", person2Id: "a" },
      { id: "r2", type: "parent-child", person1Id: "a", person2Id: "a-child" },
      { id: "r3", type: "sibling", person1Id: "a", person2Id: "b" },
      // Not a's child -- b's own, unrelated to a. If b were miscounted as
      // a's spouse, this would (harmlessly, since there's no overlap) get
      // swept into a's children grouping instead of being left unplaced.
      { id: "r4", type: "parent-child", person1Id: "b", person2Id: "b-child" },
    ];
    const { nodes } = computeFamilyTreeLayout(people, relationships);

    // a-child is still a's own child one generation below -- not folded
    // into some bogus "a+b couple" grouping the way an actual shared
    // child would be.
    expect(nodes.get("a-child")!.generation).toBe(nodes.get("a")!.generation + 1);
    expect(nodes.get("b")!.generation).toBe(nodes.get("a")!.generation);
    expectNoOverlapWithinGeneration(nodes);
  });

  it("clusters two mutually-isolated siblings together via the id tie-break", () => {
    // Neither has any other relationship recorded -- both are eligible to
    // be "the anchor", so the tie-break (lower id wins) must still pick
    // exactly one, keeping the pair clustered instead of dropping either.
    const people = [person("zed"), person("alice")];
    const relationships: Relationship[] = [
      { id: "r1", type: "sibling", person1Id: "zed", person2Id: "alice" },
    ];
    const { nodes } = computeFamilyTreeLayout(people, relationships);

    expect(nodes.get("alice")!.generation).toBe(nodes.get("zed")!.generation);
    expect(Math.abs(nodes.get("alice")!.column - nodes.get("zed")!.column)).toBe(1);
  });

  it("places multiple sibling satellites on the same anchor without overlapping", () => {
    // The realistic "more than one cousin-grandparent" case: two isolated
    // people both recorded as siblings of the same properly-anchored
    // person.
    const people = [
      person("a-parent"),
      person("a"),
      person("b"),
      person("c"),
    ];
    const relationships: Relationship[] = [
      { id: "r1", type: "parent-child", person1Id: "a-parent", person2Id: "a" },
      { id: "r2", type: "sibling", person1Id: "a", person2Id: "b" },
      { id: "r3", type: "sibling", person1Id: "a", person2Id: "c" },
    ];
    const { nodes } = computeFamilyTreeLayout(people, relationships);

    expect(nodes.get("b")!.generation).toBe(nodes.get("a")!.generation);
    expect(nodes.get("c")!.generation).toBe(nodes.get("a")!.generation);
    expectNoOverlapWithinGeneration(nodes);
  });

  it("keeps parentless siblings together outside a married anchor's couple", () => {
    // Regression for a sibling being placed between Ivan and his wife. The
    // sibling links have no recorded parents, so both brothers are satellites
    // of Ivan and must occupy the same side of him, opposite Zinaida.
    const ids = new Set([
      "ivan-petrov",
      "zinaida-petrova",
      "anatolii-petrov",
      "vasyl-petrov",
    ]);
    const people = demoPeople.filter((person) => ids.has(person.id));
    const relationships = demoRelationships.filter(
      (relationship) =>
        relationship.type === "spouse" || relationship.type === "sibling",
    ) as Relationship[];
    const { nodes } = computeFamilyTreeLayout(people, relationships);
    const column = (id: string) => nodes.get(id)!.column;

    const ivanGeneration = nodes.get("ivan-petrov")!.generation;
    for (const id of ids) expect(nodes.get(id)!.generation).toBe(ivanGeneration);

    const spouseDirection = Math.sign(column("zinaida-petrova") - column("ivan-petrov"));
    expect(Math.abs(column("zinaida-petrova") - column("ivan-petrov"))).toBe(1);
    for (const sibling of ["anatolii-petrov", "vasyl-petrov"]) {
      expect(Math.sign(column(sibling) - column("ivan-petrov"))).toBe(-spouseDirection);
    }
    expectNoOverlapWithinGeneration(nodes);

    const shuffled = [...people].reverse();
    expect(orderIndependenceProblems(people, relationships, shuffled)).toEqual([]);
  });

  it("assigns every person a node, including those only reachable through a marriage bridge", () => {
    // Two otherwise-unconnected blood lines, joined only by a marriage:
    // familyA's descendant marries familyB's descendant.
    const people = [
      person("a-parent"),
      person("a-child"),
      person("b-parent"),
      person("b-child"),
    ];
    const relationships: Relationship[] = [
      { id: "r1", type: "parent-child", person1Id: "a-parent", person2Id: "a-child" },
      { id: "r2", type: "parent-child", person1Id: "b-parent", person2Id: "b-child" },
      { id: "r3", type: "spouse", person1Id: "a-child", person2Id: "b-child" },
    ];
    const { nodes } = computeFamilyTreeLayout(people, relationships);

    expect(nodes.size).toBe(people.length);
    for (const p of people) {
      expect(nodes.has(p.id)).toBe(true);
    }
    // The marriage bridge should still align the two families' generations:
    // b-child's parent should be one row above b-child, same as a-child's parent.
    expect(nodes.get("b-parent")!.generation).toBe(nodes.get("b-child")!.generation - 1);
    expect(nodes.get("a-parent")!.generation).toBe(nodes.get("a-child")!.generation - 1);
    expect(nodes.get("a-child")!.generation).toBe(nodes.get("b-child")!.generation);
  });

  it("matches the reported scenario: a married-in spouse's parents, grandparents, and aunt all get placed", () => {
    // Mirrors the real bug report: stanislav's own family (parents +
    // grandparents + an aunt) only connects to the rest of the tree via his
    // marriage to anastasiia.
    const people = [
      person("anastasiia"),
      person("stanislav"),
      person("child"),
      person("stanislav-father"),
      person("stanislav-mother"),
      person("grandfather"),
      person("grandmother"),
      person("aunt"),
    ];
    const relationships: Relationship[] = [
      { id: "r1", type: "spouse", person1Id: "anastasiia", person2Id: "stanislav" },
      { id: "r2", type: "parent-child", person1Id: "anastasiia", person2Id: "child" },
      { id: "r3", type: "parent-child", person1Id: "stanislav", person2Id: "child" },
      {
        id: "r4",
        type: "parent-child",
        person1Id: "stanislav-father",
        person2Id: "stanislav",
      },
      {
        id: "r5",
        type: "parent-child",
        person1Id: "stanislav-mother",
        person2Id: "stanislav",
      },
      { id: "r6", type: "spouse", person1Id: "stanislav-father", person2Id: "stanislav-mother" },
      {
        id: "r7",
        type: "parent-child",
        person1Id: "grandfather",
        person2Id: "stanislav-mother",
      },
      {
        id: "r8",
        type: "parent-child",
        person1Id: "grandmother",
        person2Id: "stanislav-mother",
      },
      { id: "r9", type: "spouse", person1Id: "grandfather", person2Id: "grandmother" },
      { id: "r10", type: "parent-child", person1Id: "grandfather", person2Id: "aunt" },
      { id: "r11", type: "parent-child", person1Id: "grandmother", person2Id: "aunt" },
    ];
    const { nodes } = computeFamilyTreeLayout(people, relationships);

    expect(nodes.size).toBe(people.length);
    expect(nodes.get("stanislav-mother")!.generation).toBe(
      nodes.get("stanislav")!.generation - 1,
    );
    expect(nodes.get("grandfather")!.generation).toBe(
      nodes.get("stanislav-mother")!.generation - 1,
    );
    expect(nodes.get("aunt")!.generation).toBe(nodes.get("stanislav-mother")!.generation);
  });

  it("handles remarriage: a person with two spouses, children only from one marriage", () => {
    const people = [
      person("parent"),
      person("first-spouse"),
      person("second-spouse"),
      person("child-from-first"),
    ];
    const relationships: Relationship[] = [
      { id: "r1", type: "spouse", person1Id: "parent", person2Id: "first-spouse" },
      { id: "r2", type: "spouse", person1Id: "parent", person2Id: "second-spouse" },
      {
        id: "r3",
        type: "parent-child",
        person1Id: "parent",
        person2Id: "child-from-first",
      },
      {
        id: "r4",
        type: "parent-child",
        person1Id: "first-spouse",
        person2Id: "child-from-first",
      },
    ];
    const { nodes } = computeFamilyTreeLayout(people, relationships);

    expect(nodes.size).toBe(people.length);
    // The second spouse has no children — must still get a node, and must
    // not somehow pull child-from-first into being "their" child too.
    expect(nodes.get("second-spouse")!.generation).toBe(nodes.get("parent")!.generation);
    expect(nodes.get("child-from-first")!.generation).toBe(
      nodes.get("parent")!.generation + 1,
    );
    expectNoOverlapWithinGeneration(nodes);
  });

  it("keeps children with their own parent when siblings only share one parent (half-siblings)", () => {
    const people = [
      person("parent"),
      person("first-spouse"),
      person("second-spouse"),
      person("child-a"),
      person("child-b"),
    ];
    const relationships: Relationship[] = [
      { id: "r1", type: "spouse", person1Id: "parent", person2Id: "first-spouse" },
      { id: "r2", type: "spouse", person1Id: "parent", person2Id: "second-spouse" },
      { id: "r3", type: "parent-child", person1Id: "parent", person2Id: "child-a" },
      {
        id: "r4",
        type: "parent-child",
        person1Id: "first-spouse",
        person2Id: "child-a",
      },
      { id: "r5", type: "parent-child", person1Id: "parent", person2Id: "child-b" },
      {
        id: "r6",
        type: "parent-child",
        person1Id: "second-spouse",
        person2Id: "child-b",
      },
    ];
    const { nodes } = computeFamilyTreeLayout(people, relationships);

    expect(nodes.size).toBe(people.length);
    expect(nodes.get("child-a")!.generation).toBe(nodes.get("parent")!.generation + 1);
    expect(nodes.get("child-b")!.generation).toBe(nodes.get("parent")!.generation + 1);
  });

  it("gives every person on the same row a distinct column", () => {
    const people = [person("a"), person("b"), person("c")];
    const relationships: Relationship[] = [
      { id: "r1", type: "parent-child", person1Id: "a", person2Id: "b" },
      { id: "r2", type: "parent-child", person1Id: "a", person2Id: "c" },
    ];
    const { nodes } = computeFamilyTreeLayout(people, relationships);
    expectNoOverlapWithinGeneration(nodes);
  });

  it("keeps spouses exactly one column apart, however wide their children turn out", () => {
    const people = [
      person("husband"),
      person("wife"),
      person("child-a"),
      person("child-b"),
      person("child-c"),
      person("child-d"),
    ];
    const relationships: Relationship[] = [
      { id: "r1", type: "spouse", person1Id: "husband", person2Id: "wife" },
      { id: "r2", type: "parent-child", person1Id: "husband", person2Id: "child-a" },
      { id: "r3", type: "parent-child", person1Id: "wife", person2Id: "child-a" },
      { id: "r4", type: "parent-child", person1Id: "husband", person2Id: "child-b" },
      { id: "r5", type: "parent-child", person1Id: "wife", person2Id: "child-b" },
      { id: "r6", type: "parent-child", person1Id: "husband", person2Id: "child-c" },
      { id: "r7", type: "parent-child", person1Id: "wife", person2Id: "child-c" },
      { id: "r8", type: "parent-child", person1Id: "husband", person2Id: "child-d" },
      { id: "r9", type: "parent-child", person1Id: "wife", person2Id: "child-d" },
    ];
    const { nodes } = computeFamilyTreeLayout(people, relationships);
    const gap = Math.abs(nodes.get("husband")!.column - nodes.get("wife")!.column);
    expect(gap).toBe(1);
    expectNoOverlapWithinGeneration(nodes);
  });

  it("doesn't reserve extra width for a single-child chain (compaction)", () => {
    // grandparent -> parent -> child, no branching at all: should take no
    // more horizontal room than a single leaf, regardless of depth.
    const people = [person("grandparent"), person("parent"), person("child")];
    const relationships: Relationship[] = [
      { id: "r1", type: "parent-child", person1Id: "grandparent", person2Id: "parent" },
      { id: "r2", type: "parent-child", person1Id: "parent", person2Id: "child" },
    ];
    const { nodes } = computeFamilyTreeLayout(people, relationships);
    const columns = new Set([...nodes.values()].map((n) => n.column));
    expect(columns.size).toBe(1);
  });

  it("centers a couple above their combined children instead of sitting at the left edge", () => {
    const people = [
      person("husband"),
      person("wife"),
      person("child-a"),
      person("child-b"),
      person("child-c"),
    ];
    const relationships: Relationship[] = [
      { id: "r1", type: "spouse", person1Id: "husband", person2Id: "wife" },
      { id: "r2", type: "parent-child", person1Id: "husband", person2Id: "child-a" },
      { id: "r3", type: "parent-child", person1Id: "wife", person2Id: "child-a" },
      { id: "r4", type: "parent-child", person1Id: "husband", person2Id: "child-b" },
      { id: "r5", type: "parent-child", person1Id: "wife", person2Id: "child-b" },
      { id: "r6", type: "parent-child", person1Id: "husband", person2Id: "child-c" },
      { id: "r7", type: "parent-child", person1Id: "wife", person2Id: "child-c" },
    ];
    const { nodes } = computeFamilyTreeLayout(people, relationships);
    const childColumns = ["child-a", "child-b", "child-c"].map((id) => nodes.get(id)!.column);
    const minChild = Math.min(...childColumns);
    const maxChild = Math.max(...childColumns);
    const coupleCenter = (nodes.get("husband")!.column + nodes.get("wife")!.column) / 2;
    expect(coupleCenter).toBeGreaterThanOrEqual(minChild);
    expect(coupleCenter).toBeLessThanOrEqual(maxChild);
  });

  it("is deterministic across repeated calls with the same input", () => {
    const people = [person("a"), person("b"), person("c")];
    const relationships: Relationship[] = [
      { id: "r1", type: "parent-child", person1Id: "a", person2Id: "b" },
      { id: "r2", type: "spouse", person1Id: "a", person2Id: "c" },
    ];
    const first = computeFamilyTreeLayout(people, relationships);
    const second = computeFamilyTreeLayout(people, relationships);
    expect([...first.nodes.entries()]).toEqual([...second.nodes.entries()]);
  });

  describe("co-parents without a spouse record", () => {
    const names = ["A", "V", "L", "K", "P", "N", "C"];
    const parentChild = (
      a: string,
      b: string,
    ): Relationship => ({ id: `pc-${a}-${b}`, type: "parent-child", person1Id: a, person2Id: b });
    const baseRels: Relationship[] = [
      { id: "s-LK", type: "spouse", person1Id: "L", person2Id: "K" },
      parentChild("A", "L"),
      parentChild("V", "L"),
      parentChild("P", "K"),
      parentChild("N", "K"),
      parentChild("L", "C"),
      parentChild("K", "C"),
    ];

    function check(order: string[], rels: Relationship[]) {
      const { nodes } = computeFamilyTreeLayout(order.map((n) => person(n)), rels);
      const col = (id: string) => nodes.get(id)!.column;
      const gen = (id: string) => nodes.get(id)!.generation;
      expect(gen("A")).toBe(gen("V"));
      expect(gen("P")).toBe(gen("N"));
      expect(gen("A")).toBe(gen("L") - 1);
      expect(gen("P")).toBe(gen("K") - 1);
      expect(Math.abs(col("A") - col("V"))).toBe(1);
      expect(Math.abs(col("P") - col("N"))).toBe(1);
      // Soft constraint: roughly centred over the child, not necessarily exact.
      expect(Math.abs((col("A") + col("V")) / 2 - col("L"))).toBeLessThanOrEqual(1);
      expect(Math.abs((col("P") + col("N")) / 2 - col("K"))).toBeLessThanOrEqual(1);
      expectNoOverlapWithinGeneration(nodes);
      return nodes;
    }

    it("groups implicit co-parents adjacent and centered over their shared child", () => {
      check(names, baseRels);
    });

    it("gives the same structure regardless of which family comes first in the people array", () => {
      const a = check(["A", "V", "L", "K", "P", "N", "C"], baseRels);
      const b = check(["P", "N", "K", "L", "A", "V", "C"], baseRels);
      const gap = (n: typeof a) => Math.abs(n.get("L")!.column - n.get("K")!.column);
      expect(gap(a)).toBe(gap(b));
    });

    it("still works when the co-parents are also recorded as spouses", () => {
      check(names, [
        ...baseRels,
        { id: "s-AV", type: "spouse", person1Id: "A", person2Id: "V" },
        { id: "s-PN", type: "spouse", person1Id: "P", person2Id: "N" },
      ]);
    });
  });

  describe("anonymous family structure fixture", () => {
    const people = treeStructurePeople;
    const relationships = treeStructureRelationships;
    const nodes = computeFamilyTreeLayout(people, relationships).nodes;
    const col = (id: string) => nodes.get(id)!.column;

    const parentsOf = (id: string) =>
      relationships
        .filter((r) => r.type === "parent-child" && r.person2Id === id)
        .map((r) => r.person1Id);
    const siblingsOf = (id: string) => {
      const mine = parentsOf(id).sort().join(",");
      if (mine === "") return [];
      return people
        .map((p) => p.id)
        .filter((other) => other !== id && parentsOf(other).sort().join(",") === mine);
    };
    const partnersOf = (id: string) =>
      relationships
        .filter((r) => r.type === "spouse" && (r.person1Id === id || r.person2Id === id))
        .map((r) => (r.person1Id === id ? r.person2Id : r.person1Id));

    it("places every person", () => {
      expect(nodes.size).toBe(people.length);
      for (const p of people) {
        expect(Number.isFinite(nodes.get(p.id)?.column), `${p.id} has no column`).toBe(true);
      }
    });

    it("never lets two cards in a row overlap", () => {
      expectNoOverlapWithinGeneration(nodes);
    });

    it("keeps every pair of spouses in a row exactly one column apart", () => {
      expect(spouseGapProblems(nodes, relationships)).toEqual([]);
    });

    it("keeps a married-in partner's siblings contiguous with that partner", () => {
      // For every couple, each partner's sibling group (themselves plus their
      // siblings) must not have a foreign card between its members; only the
      // group's own partners may sit inside it.
      const problems: string[] = [];
      for (const rel of relationships) {
        if (rel.type !== "spouse") continue;
        for (const member of [rel.person1Id, rel.person2Id]) {
          const group = [member, ...siblingsOf(member)];
          if (group.length < 2) continue;
          const allowed = new Set([...group, ...group.flatMap(partnersOf)]);
          const columns = group.map(col);
          const lo = Math.min(...columns);
          const hi = Math.max(...columns);
          for (const p of people) {
            const n = nodes.get(p.id)!;
            if (n.generation !== nodes.get(member)!.generation) continue;
            if (n.column > lo && n.column < hi && !allowed.has(p.id)) {
              problems.push(`${p.id} sits between the siblings of ${member}`);
            }
          }
        }
      }
      expect(problems).toEqual([]);
    });

    it("centres each parent pair within one column of the middle of their children", () => {
      const problems: string[] = [];
      const seen = new Set<string>();
      for (const p of people) {
        const parents = parentsOf(p.id).sort();
        const key = parents.join(",");
        if (parents.length !== 2 || seen.has(key)) continue;
        seen.add(key);
        const kids = people.filter((q) => parentsOf(q.id).sort().join(",") === key);
        const kidColumns = kids.map((k) => col(k.id));
        const kidMiddle = (Math.min(...kidColumns) + Math.max(...kidColumns)) / 2;
        const parentMiddle = (col(parents[0]) + col(parents[1])) / 2;
        if (Math.abs(parentMiddle - kidMiddle) > 1 + EPS) {
          problems.push(
            `${parents.join("+")} centre ${parentMiddle} vs children centre ${kidMiddle}`,
          );
        }
      }
      expect(problems).toEqual([]);
    });

    it("gives identical relative positions whatever order the people array is in", () => {
      for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
        const shuffled = shuffle(people, mulberry32(seed));
        expect(
          orderIndependenceProblems(people, relationships, shuffled),
          `shuffle seed ${seed}`,
        ).toEqual([]);
      }
      const reversed = [...people].reverse();
      expect(orderIndependenceProblems(people, relationships, reversed), "reversed").toEqual([]);
    });
  });

  describe("random small families (seeded property test)", () => {
    type Family = { people: Person[]; relationships: Relationship[] };

    /**
     * Levels are fixed up front so generations are consistent by construction:
     * spouses and siblings share a level, children sit one level below a parent.
     */
    function randomFamily(seed: number): Family {
      const rand = mulberry32(seed);
      const int = (n: number) => Math.floor(rand() * n);
      const count = 3 + int(13);
      const levelOf = Array.from({ length: count }, () => int(4)).sort((a, b) => a - b);
      const ids = levelOf.map((_, i) => `q${String(i + 1).padStart(2, "0")}`);
      const idsAtLevel = (level: number) => ids.filter((_, i) => levelOf[i] === level);
      const relationships: Relationship[] = [];
      let nextId = 0;
      const rid = () => `r${nextId++}`;

      const partner = new Map<string, string>();
      for (let level = 0; level < 4; level++) {
        const row = shuffle(idsAtLevel(level), rand);
        for (let i = 0; i + 1 < row.length; i += 2) {
          if (rand() > 0.6) continue;
          partner.set(row[i], row[i + 1]);
          partner.set(row[i + 1], row[i]);
          if (rand() < 0.7) {
            relationships.push({
              id: rid(),
              type: "spouse",
              person1Id: row[i],
              person2Id: row[i + 1],
            });
          }
        }
      }

      for (let i = 0; i < count; i++) {
        if (levelOf[i] === 0 || rand() < 0.1) continue;
        const candidates = idsAtLevel(levelOf[i] - 1);
        if (candidates.length === 0) continue;
        const parent = candidates[int(candidates.length)];
        const other = partner.get(parent);
        const parents = other && rand() < 0.7 ? [parent, other] : [parent];
        for (const p of parents) {
          relationships.push({ id: rid(), type: "parent-child", person1Id: p, person2Id: ids[i] });
        }
      }

      const singles = ids.filter((id) => !partner.has(id));
      for (let n = 0; n < 2; n++) {
        if (rand() > 0.3) continue;
        const a = singles[int(singles.length)];
        const b = singles[int(singles.length)];
        if (!a || a === b || levelOf[ids.indexOf(a)] !== levelOf[ids.indexOf(b)]) continue;
        const exists = relationships.some(
          (r) =>
            r.type === "sibling" &&
            [r.person1Id, r.person2Id].sort().join() === [a, b].sort().join(),
        );
        if (!exists) relationships.push({ id: rid(), type: "sibling", person1Id: a, person2Id: b });
      }

      return { people: ids.map((id) => ({ id, firstName: id })), relationships };
    }

    function isConnected({ people, relationships }: Family): boolean {
      const parent = new Map(people.map((p) => [p.id, p.id]));
      const find = (x: string): string => (parent.get(x) === x ? x : find(parent.get(x)!));
      for (const r of relationships) parent.set(find(r.person1Id), find(r.person2Id));
      return new Set(people.map((p) => find(p.id))).size === 1;
    }

    it("places everyone, separates cards, keeps spouses adjacent, ignores people order", () => {
      let connected = 0;
      for (let seed = 1; seed <= 300; seed++) {
        const family = randomFamily(seed);
        const { nodes } = computeFamilyTreeLayout(family.people, family.relationships);
        const label = `seed ${seed}`;

        expect(nodes.size, label).toBe(family.people.length);
        for (const p of family.people) {
          expect(Number.isFinite(nodes.get(p.id)?.column), `${label}: ${p.id} unplaced`).toBe(true);
        }
        expect(separationProblems(nodes), label).toEqual([]);
        expect(spouseGapProblems(nodes, family.relationships), label).toEqual([]);

        // Separate components are free to be ordered by their own roots, so
        // order independence is only required for a single connected family.
        if (isConnected(family)) {
          connected++;
          const shuffled = shuffle(family.people, mulberry32(seed * 7919));
          expect(
            orderIndependenceProblems(family.people, family.relationships, shuffled),
            label,
          ).toEqual([]);
        }
      }
      expect(connected).toBeGreaterThan(30);
    });
  });

  describe("reading order", () => {
    const parentChild = (a: string, b: string): Relationship => ({
      id: `${a}>${b}`,
      type: "parent-child",
      person1Id: a,
      person2Id: b,
    });
    const spouse = (a: string, b: string): Relationship => ({
      id: `${a}+${b}`,
      type: "spouse",
      person1Id: a,
      person2Id: b,
    });

    it("keeps a simple couple in canonical order, lower rank on the left", () => {
      const { nodes } = computeFamilyTreeLayout(
        [person("b", "1950"), person("a", "1951"), person("kid", "1980")],
        [spouse("a", "b"), parentChild("a", "kid"), parentChild("b", "kid")],
      );
      expect(nodes.get("b")!.column).toBeLessThan(nodes.get("a")!.column);
    });

    it("places the canonically first root's family to the left of a later one", () => {
      const people = [
        person("x1", "1900"),
        person("x2", "1901"),
        person("y1", "1910"),
        person("y2", "1911"),
        person("xk", "1930"),
        person("yk", "1935"),
      ];
      const relationships = [
        spouse("x1", "x2"),
        spouse("y1", "y2"),
        parentChild("x1", "xk"),
        parentChild("x2", "xk"),
        parentChild("y1", "yk"),
        parentChild("y2", "yk"),
        spouse("xk", "yk"),
      ];
      const { nodes } = computeFamilyTreeLayout(people, relationships);
      expect(nodes.get("x1")!.column).toBeLessThan(nodes.get("y1")!.column);
      expect(nodes.get("xk")!.column).toBeLessThan(nodes.get("yk")!.column);
    });
  });

  it("handles an empty family", () => {
    const { nodes } = computeFamilyTreeLayout([], []);
    expect(nodes.size).toBe(0);
  });
});

describe("computeFamilyTreeLayout hardening", () => {
  const parentChild = (parent: string, child: string): Relationship => ({
    id: `pc-${parent}-${child}`,
    type: "parent-child",
    person1Id: parent,
    person2Id: child,
  });
  const spouse = (a: string, b: string): Relationship => ({
    id: `sp-${a}-${b}`,
    type: "spouse",
    person1Id: a,
    person2Id: b,
  });

  function expectComplete(people: Person[], relationships: Relationship[]) {
    const started = Date.now();
    const { nodes } = computeFamilyTreeLayout(people, relationships);
    expect(Date.now() - started).toBeLessThan(2000);
    expect(nodes.size).toBe(people.length);
    for (const p of people) {
      const node = nodes.get(p.id);
      expect(node, p.id).toBeDefined();
      expect(Number.isFinite(node!.generation), p.id).toBe(true);
      expect(Number.isFinite(node!.column), p.id).toBe(true);
    }
    return nodes;
  }

  it("terminates on a cyclic ancestry above a married-in partner", () => {
    // spouse(a, c); x is c's parent, y is x's parent, and x is y's parent.
    const people = ["a", "c", "x", "y"].map((id) => person(id));
    expectComplete(people, [
      spouse("a", "c"),
      parentChild("x", "c"),
      parentChild("y", "x"),
      parentChild("x", "y"),
    ]);
  });

  it("returns a complete layout for self-parents, mutual parents and other cycles", () => {
    const people = ["a", "b", "c", "d", "e"].map((id) => person(id));
    const cases: Relationship[][] = [
      [parentChild("a", "a")],
      [parentChild("a", "b"), parentChild("b", "a")],
      [parentChild("a", "b"), parentChild("b", "c"), parentChild("c", "a")],
      // a partner who is also an ancestor, and a parent who is also a spouse
      [spouse("a", "b"), parentChild("b", "a"), parentChild("a", "c"), parentChild("c", "b")],
      [spouse("a", "a"), spouse("a", "b"), spouse("b", "a")],
      // duplicate records
      [parentChild("a", "b"), parentChild("a", "b"), spouse("a", "c"), spouse("c", "a")],
      // a record naming someone who is not in the family
      [parentChild("a", "ghost"), parentChild("ghost", "b"), spouse("ghost", "c")],
      [parentChild("a", "b"), parentChild("b", "c"), parentChild("c", "d"), parentChild("d", "b"), spouse("e", "d")],
    ];
    for (const relationships of cases) expectComplete(people, relationships);
  });

  it("keeps spouses and rows apart even when ancestry is cyclic", () => {
    const people = ["a", "b", "c", "d"].map((id) => person(id));
    const relationships = [
      spouse("a", "b"),
      parentChild("a", "c"),
      parentChild("b", "c"),
      parentChild("c", "a"),
      spouse("c", "d"),
    ];
    const nodes = expectComplete(people, relationships);
    expect(separationProblems(nodes)).toEqual([]);
  });

  it("lays out a couple with a very wide row of children quickly and without overlap", () => {
    const people = [person("mum"), person("dad")];
    const relationships: Relationship[] = [spouse("mum", "dad")];
    for (let i = 0; i < 200; i++) {
      people.push(person(`kid-${String(i).padStart(3, "0")}`, String(1900 + (i % 90))));
      relationships.push(parentChild("mum", `kid-${String(i).padStart(3, "0")}`));
      relationships.push(parentChild("dad", `kid-${String(i).padStart(3, "0")}`));
    }
    const started = Date.now();
    const { nodes } = computeFamilyTreeLayout(people, relationships);
    expect(Date.now() - started).toBeLessThan(2000);
    expect(separationProblems(nodes)).toEqual([]);
    expect(spouseGapProblems(nodes, relationships)).toEqual([]);
    // Siblings keep birth-date order, the couple sits over the middle.
    const kidColumns = people.slice(2).map((p) => nodes.get(p.id)!.column);
    const centre = (nodes.get("mum")!.column + nodes.get("dad")!.column) / 2;
    expect(centre).toBeGreaterThan(Math.min(...kidColumns));
    expect(centre).toBeLessThan(Math.max(...kidColumns));
  });

  it("stays deterministic and order independent on a wide multi-family tree", () => {
    const people: Person[] = [];
    const relationships: Relationship[] = [];
    for (let f = 0; f < 10; f++) {
      people.push(person(`f${f}`, "1900"), person(`w${f}`, "1901"));
      relationships.push(spouse(`f${f}`, `w${f}`));
      for (let k = 0; k < 40; k++) {
        const id = `c${f}-${String(k).padStart(2, "0")}`;
        people.push(person(id, String(1930 + k)));
        relationships.push(parentChild(`f${f}`, id), parentChild(`w${f}`, id));
      }
    }
    const started = Date.now();
    const first = computeFamilyTreeLayout(people, relationships);
    expect(Date.now() - started).toBeLessThan(2000);
    expect(separationProblems(first.nodes)).toEqual([]);
    expect(spouseGapProblems(first.nodes, relationships)).toEqual([]);
    expect(
      orderIndependenceProblems(people, relationships, shuffle(people, mulberry32(7))),
    ).toEqual([]);
  });

  it("lays out a deep single-child chain as one straight column without overflowing the stack", () => {
    const people: Person[] = [];
    const relationships: Relationship[] = [];
    for (let i = 0; i < 3000; i++) {
      people.push(person(`gen-${String(i).padStart(4, "0")}`));
      if (i > 0) {
        relationships.push(
          parentChild(`gen-${String(i - 1).padStart(4, "0")}`, `gen-${String(i).padStart(4, "0")}`),
        );
      }
    }
    const started = Date.now();
    const { nodes } = computeFamilyTreeLayout(people, relationships);
    expect(Date.now() - started).toBeLessThan(2000);
    expect(nodes.size).toBe(3000);
    expect(new Set([...nodes.values()].map((n) => n.column)).size).toBe(1);
  });
});
