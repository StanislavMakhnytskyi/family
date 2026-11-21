import type { Person, Relationship } from "@/lib/schemas";

/**
 * Anonymous 29-person family with the structural shapes that stress the tree
 * layout: a couple whose partner has parents (a bridge), two sibling groups
 * meeting at a married-in couple, a single child, an in-law couple three
 * generations deep, a parentless sibling pair, and implicit co-parent pairs
 * (no spouse record). Ids are numbered left to right within sibling groups.
 * No names, dates or photos from real data.
 */
const ids = Array.from({ length: 29 }, (_, i) => `p${String(i + 1).padStart(2, "0")}`);

export const treeStructurePeople: Person[] = ids.map((id) => ({
  id,
  firstName: `Person ${id.slice(1)}`,
}));

const spouse = (a: string, b: string): Relationship => ({
  id: `s-${a}-${b}`,
  type: "spouse",
  person1Id: a,
  person2Id: b,
});

const family = (parents: [string, string], children: string[]): Relationship[] =>
  children.flatMap((child) =>
    parents.map(
      (parent): Relationship => ({
        id: `pc-${parent}-${child}`,
        type: "parent-child",
        person1Id: parent,
        person2Id: child,
      }),
    ),
  );

export const treeStructureRelationships: Relationship[] = [
  spouse("p05", "p06"),
  spouse("p07", "p08"),
  spouse("p10", "p11"),
  spouse("p13", "p14"),
  spouse("p15", "p16"),
  spouse("p17", "p18"),
  spouse("p20", "p21"),
  spouse("p22", "p23"),
  spouse("p24", "p25"),
  { id: "sib-p08-p09", type: "sibling", person1Id: "p08", person2Id: "p09" },
  // p01+p02 and p03+p04 are implicit co-parents: no spouse record.
  ...family(["p01", "p02"], ["p13"]),
  ...family(["p03", "p04"], ["p14"]),
  ...family(["p05", "p06"], ["p10", "p12", "p15"]),
  ...family(["p07", "p08"], ["p17"]),
  ...family(["p13", "p14"], ["p18", "p19"]),
  ...family(["p10", "p11"], ["p20", "p22"]),
  ...family(["p15", "p16"], ["p24"]),
  ...family(["p17", "p18"], ["p25"]),
  ...family(["p20", "p21"], ["p26", "p27"]),
  ...family(["p22", "p23"], ["p28"]),
  ...family(["p24", "p25"], ["p29"]),
];
