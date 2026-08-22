import { describe, expect, it } from "vitest";
import { computeFamilyTreeLayout } from "@/lib/family-tree-layout";
import type { Person, Relationship } from "@/lib/schemas";

function person(id: string, birthDate = "2000"): Person {
  return { id, firstName: id, lastName: id, birthDate };
}

/**
 * The real invariant that matters for avoiding visual overlap: two people
 * on the *same row* (generation) must never land on the same column.
 * People on different rows sharing a column is fine — they render at
 * different heights and can't collide.
 */
function expectNoOverlapWithinGeneration(nodes: ReturnType<typeof computeFamilyTreeLayout>["nodes"]) {
  const byGeneration = new Map<number, number[]>();
  for (const node of nodes.values()) {
    const list = byGeneration.get(node.generation) ?? [];
    list.push(node.column);
    byGeneration.set(node.generation, list);
  }
  for (const [generation, columns] of byGeneration) {
    expect(new Set(columns).size, `generation ${generation} has overlapping columns`).toBe(
      columns.length,
    );
  }
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

  it("handles an empty family", () => {
    const { nodes } = computeFamilyTreeLayout([], []);
    expect(nodes.size).toBe(0);
  });
});
